/*!
    @preserve

 	ATON VRoadcast Service

 	@author Bruno Fanini
	VHLab, CNR ITABC

==================================================================================*/

const PORT = 8080;
const MAXCLIENTSPERSCENE = 100;
const MAXTARGDIST = 40.0;
const RECORD_SEPARATOR = ",";


const express = require('express');
const app     = express();
const http    = require('http').Server(app);

// creates a new socket.io instance attached to the http server
const io = require('socket.io')(http);

// For record trace
const fs = require('fs');
const distance = require('euclidean-distance');
const aabb  = require('aabb-3d');
const clamp = require('clamp');
const now = require("performance-now");

//const Png = require("png").Png;
//const PNG = require('pngjs').PNG;
const Jimp = require('jimp');


// Command line
const commandLineArgs = require('command-line-args');

const optDefs = [
    { name: 'trace', alias: 't', type: Number}, // in milliseconds
    { name: 'www', type: String, defaultOption: __dirname+"/" },
    { name: 'production', type: Boolean}
//    { name: 'timeout', alias: 't', type: Number }
];
// Parse options
const serviceOptions = commandLineArgs(optDefs);
console.log(serviceOptions);

// Production
if (serviceOptions.production){
    console.log = function() {};
}

// Scene Nodes (rooms)
var sceneNodes = {};

// Global Time
const tick = function(){ return (now() * 0.001).toFixed(3); };
var time = tick();


// Sign Boxes (min, max)
var globalSignBox    = aabb([-10.0, -10.0, -1.0], [10.0, 10.0, 20.0]);
var globalSignFocIMG = undefined;


// Session file record
//=====================================================
// Record Daemon
var TraceDaemon = function(){
    time = tick();

    // Loop all scenes
    for (var sn in sceneNodes){

        var scene = sceneNodes[sn];
        
        // Loop users in this scene
        scene.clients.forEach(user => {

            if (user && user.bRecordWrite){
                writeClientRecord(user, sn);
                user.bRecordWrite = false;
                }
            });
        
        if (scene.bRecordWrite){
            writeGlobalRecord(sn);
            scene.bRecordWrite = false;
            }
        }

    //console.log( tick() + " Record Daemon...");
};

var outRecordFolder = __dirname+"/record/";
var currDate = new Date(); // unused

var bRecord = false;
if (serviceOptions.trace && (serviceOptions.trace > 0)){
    bRecord = true;
    setInterval(TraceDaemon, serviceOptions.trace);
    }



// WebServer
//=======================================================
if (serviceOptions.www) app.use('/', express.static( serviceOptions.www ));
else app.use('/', express.static( __dirname + '/' ));
//app.use(compression());

// Common
//=======================================================

var touchSceneNode = function(sname){
    if (sceneNodes[sname]) return sceneNodes[sname];

    // First time
    sceneNodes[sname] = {};
    var scene = sceneNodes[sname];

    scene.clients      = [];
    scene.numClients   = 0; // Note: scene.clients[] may not be contiguous
    scene.bRecordWrite = false;

    console.log("Created scene "+sname);
    //console.log(scene);

    if (bRecord) initGlobalRecord(sname);

    return scene;
};

var touchClient = function(id, scene){
    if (scene === undefined) return undefined;

    // Create a new client in this scene
    scene.clients[id] = {};  
    var clientInfo = scene.clients[id];

    clientInfo.position    = [0.0,0.0,0.0];
    clientInfo.orientation = [0.0,0.0,0.0,1.0];
    clientInfo.scale       = 1.0;
    clientInfo.id          = id;
    clientInfo.target      = [0.0,0.0,0.0];
    clientInfo.focus       = [0.0,0.0,0.0];

    // signatures
    clientInfo.signFocBin = undefined;
    clientInfo.signFocIMG = undefined;

    clientInfo.bRecordWrite = false;

    return clientInfo;
};

// Assign first available slot (id) in scene, -1 if not possible
var assignIDinScene = function(scene){
    if (scene === undefined) return -1;

    var clientsTableSize = scene.clients.length;

    // First search for available slot
    for( var i=0; i<clientsTableSize; i++ ){
        if (scene.clients[i] === undefined) return i;
        }
    
    // Otherwise return tail index
    if (clientsTableSize < MAXCLIENTSPERSCENE) return clientsTableSize;

    return -1; 
};

// DEPRECATED
/*
var assignID = function(){
    var clientsTableSize = clients.length;

    // First search for available slot
    for( var i=0; i<clientsTableSize; i++ ){
        if (clients[i] === undefined) return i;
        }
    
    // Otherwise return tail index
    if (clientsTableSize < MAXCLIENTSPERSCENE) return clientsTableSize;

    return -1;
};
*/

var decodeUserStateData = function(data){
    var user = {};

    user.pos = [
                data.readFloatLE(0),
                data.readFloatLE(4),
                data.readFloatLE(8)
                ];

    user.scale = data.readFloatLE(12);

    user.ori = [
                data.readInt8(16) / 128.0,
                data.readInt8(17) / 128.0,
                data.readInt8(18) / 128.0,
                data.readInt8(19) / 128.0
                ];

    return user;
};

// Focus
var decodeDFocus = function(binData){
    var a8 = new Int8Array(12);
    for (var i=0; i<12; i++) a8[i] = binData[i];

    var A = new Float32Array(a8.buffer);

    var DT = [0.0,0.0,0.0];
    DT[0] = A[0];
    DT[1] = A[1];
    DT[2] = A[2];

    //console.log(DT);
    return DT;
};

var encodeUserStateData = function(c){
    //var c = clients[index];

    var A = new Float32Array(6);
    A[0] = c.position[0];
    A[1] = c.position[1];
    A[2] = c.position[2];
    A[3] = c.scale;

    // Convert to byte array
    var binData = new Int8Array(A.buffer);
    //console.log(binData);
    binData[16] = (c.orientation[0] * 128.0);
    binData[17] = (c.orientation[1] * 128.0);
    binData[18] = (c.orientation[2] * 128.0);
    binData[19] = (c.orientation[3] * 128.0);

    binData[20] = c.id; // unsigned byte id

    return binData;
};

// Send a snapshot of a specific client ID
var sendClientSnapshot = function(socket, id, scene){
    var clientInfo = scene.clients[id];
    if (clientInfo === undefined) return;

    var binData = encodeUserStateData(clientInfo);

    // Snapshot
    socket.emit("USTATE", binData );

    if (clientInfo.name !== undefined) 
        socket.emit("UNAME", {id: clientInfo.id, name: clientInfo.name } );
    if (clientInfo.status !== undefined) 
        socket.emit("UMSG", {id: clientInfo.id, status: clientInfo.status } );
    if (clientInfo.encodedDFocus !== undefined)
        socket.emit("UFOCUSD",clientInfo.encodedDFocus);
    if (clientInfo.encodedWeight !== undefined)
        socket.emit("UMAGWEIGHT", {id: clientInfo.id, weight: clientInfo.encodedWeight } );
    if (clientInfo.encodedRadius !== undefined)
        socket.emit("UMAGRADIUS", {id: clientInfo.id, weight: clientInfo.encodedRadius } );
};

// Send a global snapshot, except myid
var sendGlobalSnapshot = function(socket, myid, scene){
    //var scene = socket.sceneNode;
    var clientsTableSize = scene.clients.length;

    // For each client different from myid, send snapshot
    for( var i=0; i<clientsTableSize; i++ ){
        if (scene.clients[i] !== undefined){
            if (i !== myid) sendClientSnapshot(socket, i, scene);
            }
        }
};

// Record/Trace
//================================
var getRecordFilepath = function(c, scenename){
    return outRecordFolder+scenename+"/U"+c.id+'.csv';
};

var getSignatureFocusFilepath = function(c, scenename){
    return outRecordFolder+scenename+"/focsign"+c.id+'.png';
};

var getGlobalSignatureFocusFilepath = function(scenename){
    return outRecordFolder+scenename+"/gfocsign.png";
};

var getGlobalRecordFilepath = function(scenename){
    return outRecordFolder+scenename+"/swarm.csv";
};

var initGlobalRecord = function(scenename){
    if (!fs.existsSync(outRecordFolder)) fs.mkdirSync(outRecordFolder);
    if (!fs.existsSync(outRecordFolder+scenename)) fs.mkdirSync(outRecordFolder+scenename);

    // Header
    var recStream = fs.createWriteStream(getGlobalRecordFilepath(scenename), {'flags': 'w'});

    // 'Hours'+RECORD_SEPARATOR+'Minutes'+RECORD_SEPARATOR+'Seconds'
    recStream.write(
        'Time'+RECORD_SEPARATOR+
        'Users'+RECORD_SEPARATOR+
        
        'swarmX'+RECORD_SEPARATOR+
        'swarmY'+RECORD_SEPARATOR+
        'swarmZ'+RECORD_SEPARATOR+
        'swarmRadius'+RECORD_SEPARATOR+
        
        'swarmFX'+RECORD_SEPARATOR+
        'swarmFY'+RECORD_SEPARATOR+
        'swarmFZ'+RECORD_SEPARATOR+
        'swarmFocRadius\n');

    // 
    globalSignFocIMG = new Jimp(4096, MAXCLIENTSPERSCENE);

    console.log("Global Record initialized for scene "+scenename);
};

var writeGlobalRecord = function(scenename){
    if (scenename === undefined) return;

    var S = sceneNodes[scenename];
    if (S === undefined) return;

    var numUsers = S.numClients; //S.clients.length;
    if (numUsers < 1) return;

    // Time freq barrier
    //var ts = tick();
    //if ((ts - tLastMark) < tRecordFreq) return;
    //tLastMark = ts;

    var x=0.0,y=0.0,z=0.0;
    var fx=0.0,fy=0.0,fz=0.0;

    var locMin = [ undefined, undefined, undefined];
    var locMax = [ undefined, undefined, undefined];
    var focMin = [ undefined, undefined, undefined];
    var focMax = [ undefined, undefined, undefined];
    var locRad=0.0, focRad=0.0;

    S.clients.forEach(u => {
        if (u !== undefined){
            x += u.position[0];
            y += u.position[1];
            z += u.position[2];

            if (locMin[0] === undefined || u.position[0] < locMin[0]) locMin[0] = u.position[0];
            if (locMin[1] === undefined || u.position[1] < locMin[1]) locMin[1] = u.position[1];
            if (locMin[2] === undefined || u.position[2] < locMin[2]) locMin[2] = u.position[2];

            if (locMax[0] === undefined || u.position[0] > locMax[0]) locMax[0] = u.position[0];
            if (locMax[1] === undefined || u.position[1] > locMax[1]) locMax[1] = u.position[1];
            if (locMax[2] === undefined || u.position[2] > locMax[2]) locMax[2] = u.position[2];

            fx += u.focus[0];
            fy += u.focus[1];
            fz += u.focus[2];

            if (focMin[0] === undefined || u.focus[0] < focMin[0]) focMin[0] = u.focus[0];
            if (focMin[1] === undefined || u.focus[1] < focMin[1]) focMin[1] = u.focus[1];
            if (focMin[2] === undefined || u.focus[2] < focMin[2]) focMin[2] = u.focus[2];

            if (focMax[0] === undefined || u.focus[0] > focMax[0]) focMax[0] = u.focus[0];
            if (focMax[1] === undefined || u.focus[1] > focMax[1]) focMax[1] = u.focus[1];
            if (focMax[2] === undefined || u.focus[2] > focMax[2]) focMax[2] = u.focus[2];
            }
        });

    x /= numUsers;
    y /= numUsers;
    z /= numUsers;

    fx /= numUsers;
    fy /= numUsers;
    fz /= numUsers;

    locRad = distance(locMax,locMin) * 0.5;
    focRad = distance(focMax,focMin) * 0.5;

    //console.log("SwarmAVG: "+x+", "+y+", "+z);

    // Write
    // appendFileSync
    fs.appendFile(
        getGlobalRecordFilepath(scenename),
        time +RECORD_SEPARATOR+
        parseInt(S.numClients) +RECORD_SEPARATOR+
        
        x.toFixed(3) +RECORD_SEPARATOR+ 
        y.toFixed(3) +RECORD_SEPARATOR+ 
        z.toFixed(3) +RECORD_SEPARATOR+ 
        locRad.toFixed(3) +RECORD_SEPARATOR+

        fx.toFixed(3) +RECORD_SEPARATOR+ 
        fy.toFixed(3) +RECORD_SEPARATOR+ 
        fz.toFixed(3) +RECORD_SEPARATOR+ 
        focRad.toFixed(3) +"\n",
        function (err) { });
};

// User trace
var initClientRecord = function(c, scenename){
    if (c === undefined) return;
    if (scenename === undefined) return;

    if (!fs.existsSync(outRecordFolder)) fs.mkdirSync(outRecordFolder);
    if (!fs.existsSync(outRecordFolder+scenename)) fs.mkdirSync(outRecordFolder+scenename);

    // Header
    var recStream = fs.createWriteStream(getRecordFilepath(c,scenename), {'flags': 'w'});

    // 'Hours'+RECORD_SEPARATOR+'Minutes'+RECORD_SEPARATOR+'Seconds'
    recStream.write(
        'Time'+RECORD_SEPARATOR+

        'px'+RECORD_SEPARATOR+
        'py'+RECORD_SEPARATOR+
        'pz'+RECORD_SEPARATOR+

        'ox'+RECORD_SEPARATOR+
        'oy'+RECORD_SEPARATOR+
        'oz'+RECORD_SEPARATOR+
        'ow'+RECORD_SEPARATOR+
        
        'fx'+RECORD_SEPARATOR+
        'fy'+RECORD_SEPARATOR+
        'fz\n');

    //c.signFoc    = new Buffer(4096 * 3); // IMAGE_WIDTH * IMAGE_HEIGHT * 3
    c.signFocIMG = new Jimp(4096, 1);
    c.signFocBin = new Uint8Array(4);

    console.log("Initialised Record "+getRecordFilepath(c,scenename));
};

var writeClientRecord = function(c, scenename){
    if (c === undefined) return;
    if (scenename === undefined) return;

    // Timestamp (H M S)
    //currDate = new Date();
    //var ts = currDate.getHours()+RECORD_SEPARATOR+currDate.getMinutes() +RECORD_SEPARATOR+ currDate.getSeconds();

    // Time freq barrier
    //var ts = tick();
    //if ((ts - tLastMark) < tRecordFreq) return;
    //tLastMark = ts;

    // Write
    // appendFileSync
    fs.appendFile(
        getRecordFilepath(c, scenename),
        time +RECORD_SEPARATOR+
        
        c.position[0].toFixed(3) +RECORD_SEPARATOR+
        c.position[1].toFixed(3) +RECORD_SEPARATOR+
        c.position[2].toFixed(3) +RECORD_SEPARATOR+

        c.orientation[0].toFixed(3) +RECORD_SEPARATOR+ 
        c.orientation[1].toFixed(3) +RECORD_SEPARATOR+ 
        c.orientation[2].toFixed(3) +RECORD_SEPARATOR+ 
        c.orientation[3].toFixed(3) +RECORD_SEPARATOR+

        c.focus[0].toFixed(3) +RECORD_SEPARATOR+
        c.focus[1].toFixed(3) +RECORD_SEPARATOR+
        c.focus[2].toFixed(3) +"\n",
        function (err) { });

    // Focus sign.
    var w = Math.floor(time * serviceOptions.trace * 0.1);
    w = w % 4096;
/*
    c.signFoc[p + 0] = parseInt(c.focus[0]); // r (0-255)
    c.signFoc[p + 1] = parseInt(c.focus[1]); // g (0-255)
    c.signFoc[p + 2] = parseInt(c.focus[2]); // b (0-255)
*/

    var sxi = (c.focus[0] - globalSignBox.x0()) / globalSignBox.width();
    var syi = (c.focus[1] - globalSignBox.y0()) / globalSignBox.height();
    var szi = (c.focus[2] - globalSignBox.z0()) / globalSignBox.depth();
    var sa  = 255;
/*
    sxi = clamp(sxi, 0.0,1.0) * 255.0;
    syi = clamp(syi, 0.0,1.0) * 255.0;
    szi = clamp(szi, 0.0,1.0) * 255.0;
*/
    // full black & alpha=0 outside volume
    if ( sxi < 0.0 || sxi > 1.0 || syi < 0.0 || syi > 1.0 || szi < 0.0 || szi > 1.0 ){
        sxi = 0.0;
        syi = 0.0;
        szi = 0.0;
        sa  = 0;
        }

    sxi *= 255.0;
    syi *= 255.0;
    szi *= 255.0;

    c.signFocBin[0] = parseInt(sxi);
    c.signFocBin[1] = parseInt(syi);
    c.signFocBin[2] = parseInt(szi);
    c.signFocBin[3] = sa;

    //console.log(c.signFocBin);

    c.signFocBUF = Buffer.from(c.signFocBin);
    c.signFocCOL = c.signFocBUF.readUIntBE(0,4);
    //c.signFocCOL = (c.signFocBin[2]*256) + (c.signFocBin[1]*256*256) + (c.signFocBin[0]*256*256*256) + 255;

    //console.log(col);

    if (c.signFocIMG){
        c.signFocIMG.setPixelColor(c.signFocCOL, w, 0);
        c.signFocIMG.write( getSignatureFocusFilepath(c,scenename) );
        }

    if (globalSignFocIMG){
        globalSignFocIMG.setPixelColor(c.signFocCOL, w, c.id);
        globalSignFocIMG.write( getGlobalSignatureFocusFilepath(scenename) );
        }
};





// Socket.io Server
//=======================================================
// Whenever someone connects this gets executed
io.on('connection', function(socket){

    // Local to this connected client
    var assignedID = -1;
    
    var sceneName    = undefined;
    var scene        = undefined;
    var clientInfo   = undefined;

/*
    //socket.emit(..); // only this client
    //socket.broadcast.emit(..) // all the others

    //socket.broadcast.to(room).emit(..) // broadcasts to all sockets in the given room, except to the socket on which it was called
    //io.sockets.in(room).emit(..) // broadcasts to all sockets in the given room
*/

    // A request for a scenenode (room)
    socket.on('ENTER', function (data) {
        sceneName = data.scene;
        scene = touchSceneNode(sceneName);

        console.log("> ENTER request in scene "+sceneName);
        //console.log(sceneNodes);

        socket.join(sceneName);
        //console.log(scene);

        assignedID = assignIDinScene(scene);
        if (assignedID>=0){
            clientInfo = touchClient(assignedID,scene);

            scene.numClients++;

            // Send assigned ID to the user
            socket.emit("ID", { id: assignedID } );

            // Send a global snapshot of scene to this client
            sendGlobalSnapshot(socket, assignedID, scene);

            // Inform other clients
            //socket.broadcast.emit("ENTER", { id: assignedID } );
            socket.broadcast.to(sceneName).emit("ENTER", { id: assignedID } );

            // Record
            if (bRecord) initClientRecord(clientInfo, sceneName);

            console.log("USER '"+assignedID+"' joined scene '"+sceneName+"'");
            }
        });

    // Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
        socket.leave(sceneName);

        if (scene !== undefined && assignedID>=0){
            delete scene.clients[assignedID];
            if (scene.numClients>0) scene.numClients--;

            socket.broadcast.to(sceneName).emit("UMAGWEIGHT", { id: assignedID, weight: 0.0 } );
            socket.broadcast.to(sceneName).emit("LEAVE", { id: assignedID } );

            console.log("USER '" + assignedID + "' DISCONNECTED from scene "+sceneName+" - Num. Clients: "+scene.numClients);

            if (scene.numClients === 0){
                delete scene;
                delete sceneNodes[sceneName];
                console.log("DELETED scene "+sceneName);
                }
            }
        });
    
    // Receive user state
    socket.on('USTATE', function(data){
        if (clientInfo === undefined) return;
        //console.log(data);

        var u = decodeUserStateData(data);

        // Update
        clientInfo.position    = u.pos.slice(0);
        clientInfo.scale       = u.scale;
        clientInfo.orientation = u.ori.slice(0);

        // Record on file
        if (assignedID>=0 && bRecord){
            //writeClientRecord(clientInfo);
            //writeGlobalRecord(sceneName);
            clientInfo.bRecordWrite = true;
            scene.bRecordWrite      = true;
            }

        //console.log(clientInfo);

        var binData = encodeUserStateData(clientInfo);

        //socket.broadcast.emit("USTATE", binData );
        socket.broadcast.to(sceneName).emit("USTATE", binData );
        });

    // Receive Focus distance update
    socket.on('UFOCUSD', function(data){
        if (clientInfo === undefined) return;

        //console.log(data.bin);

        var dFocus = decodeDFocus(data.bin);
        clientInfo.focus[0] = clientInfo.position[0] + dFocus[0];
        clientInfo.focus[1] = clientInfo.position[1] + dFocus[1];
        clientInfo.focus[2] = clientInfo.position[2] + dFocus[2];

        // Record on file
        if (assignedID>=0 && bRecord){
            //writeClientRecord(clientInfo);
            //writeGlobalRecord(sceneName);
            clientInfo.bRecordWrite = true;
            scene.bRecordWrite      = true;
            }

        //clientInfo.targDist = data.readFloatLE(0);
        socket.broadcast.to(sceneName).emit("UFOCUSD", data );

        clientInfo.encodedDFocus = data;
        });
    
    // Receive username update
    socket.on('UNAME', function(data){
        if (clientInfo === undefined) return;

        clientInfo.name = data.name;

        // Update other clients
        console.log(data);
        //socket.broadcast.emit("UNAME", data );
        socket.broadcast.to(sceneName).emit("UNAME", data );
        });
    
    // Receive status update
    socket.on('UMSG', function(data){
        if (clientInfo === undefined) return;

        clientInfo.status = data.status;

        // Update other clients
        console.log(data);
        //socket.broadcast.emit("UMSG", data );
        socket.broadcast.to(sceneName).emit("UMSG", data );
        });
    
    // Receive user weight update
    socket.on('UMAGWEIGHT', function(data){
        if (clientInfo === undefined) return;

        clientInfo.encodedWeight = data.weight;

        // Update other clients
        console.log(data);
        //socket.broadcast.emit("UNAME", data );
        socket.broadcast.to(sceneName).emit("UMAGWEIGHT", data );
        });
    
    // Receive user mag radius update
    socket.on('UMAGRADIUS', function(data){
        if (clientInfo === undefined) return;

        clientInfo.encodedRadius = data.radius;

        // Update other clients
        console.log(data);
        //socket.broadcast.emit("UNAME", data );
        socket.broadcast.to(sceneName).emit("UMAGRADIUS", data );
        });

});




http.listen(PORT, function(){
    console.log('Listening on *:'+PORT);
});