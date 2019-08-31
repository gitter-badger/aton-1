/*!
    @preserve

 	ATON FrontEnd

 	@author Bruno Fanini
	VHLab, CNR ITABC

==================================================================================*/

ATON.FE = {};

// root paths
ATON.FE.MODELS_ROOT = "../models/";
ATON.FE.RES_ROOT    = "../res/";
ATON.FE.QV_ROOT     = "../qv/";
ATON.FE.AUDIO_ROOT  = "../res/audio/";

// VRoadcast
var vrcIP = ATON.utils.getURLparams().vrc;
var QAurl = undefined;
var QPV   = undefined;


var auPOL = new Audio(ATON.FE.AUDIO_ROOT+"forcefield.wav");
auPOL.loop = true;

//ATON.vroadcast.onPolDataReceived = function(){
ATON.on("VRC_PolDataReceived", function(){
    if (QPV === undefined) return;

    QPV.setQVAimgBase64(ATON.vroadcast._polDATA);
});

//ATON.vroadcast.onPolCellReceived = function(){
ATON.on("VRC_PolCellReceived", function(){
    if (QPV === undefined) return;
    if (ATON.vroadcast._polCELL === undefined) return;
    
    let v = ATON.vroadcast._polCELL.v;
    if (v === undefined) return;

    //console.log(v);

    var col8 = new Uint8Array(4);
    view = new DataView(col8.buffer);
    view.setUint32(0, v, false);

    // DEBUG_PCELLS
    //console.log("Received Cell: "+col8);

    //
    QPV.setPixel(ATON.vroadcast._polCELL.i, ATON.vroadcast._polCELL.j, col8);

    //ATON.vroadcast.requestPol();
});


// QV / QUSV
ATON.tracer.onAllFileRequestsCompleted = function(){
    $("#uSessionTime").val(0.0);
    $("#uSessionTRad").val(0.0);

    ATON.FE.filterRecords();
};
ATON.FE.loadSencData = function(qv, scenename, attrib, bSIG){
    if (qv === undefined) return;

    ATON.toggleSessionEncoderPass(true, bSIG);
    if (bSIG) qv.loadQVAimg("../services/record/"+scenename+"/"+attrib+"-sig.png");
    else {
        qv.qvaIMGfilter = osg.Texture.LINEAR;
        qv.loadQVAimg("../services/record/"+scenename+"/"+attrib+"_qsa0.png");
        }

    $("#idSession").show();

    ATON.setDim(0.3);
    $('body').css('background-color', 'black');
    ATON.setFogColor(osg.vec4.fromValues(0.0,0.0,0.0, 0.0));

    $("#uSessionTime").val(0.0);
    $("#uSessionTRad").val(0.8); // 80 cm (arm len)
    ATON.FE.filterRecords();
};


ATON.FE._growVolume = new osg.BoundingBox();
ATON.FE._growVolume.init();

var uColors = [
    '255, 0, 0',
    '255, 255, 0',
    '0, 255, 0',
    '0, 255, 255',
    '0, 0, 255',
    '255, 0, 255'
];

// On node requests
ATON.on("NodeRequestFired", ()=>{
    $('#idLoader').show();
});

ATON.on("VRmode", function(v){
    if (v) $('#iContainer').hide();
    else $('#iContainer').show();
});


ATON.FE.setupPage = function(){
    ATON.FE.ssRec = false;

    $("#idSession").hide();

    var iContainer = document.getElementById( "iContainer" );
    var iVRCcontainer = document.getElementById( "idVRCpanel" );
    iContainer.addEventListener( 'keydown', function ( e ) { e.stopPropagation(); }, false );
    iVRCcontainer.addEventListener( 'keydown', function ( e ) { e.stopPropagation(); }, false );
    
    ATON.FE.setUserName = function(){
        var el = document.getElementById('uname');
        ATON.vroadcast.setUserName(el.value);
        $('#uname').hide();
        };
    
    ATON.FE.setStatus = function(){
        var el = document.getElementById('ustatus');
        ATON.vroadcast.setStatus(el.value);
        el.value = "";
        };
    ATON.FE.setWeight = function(){
        var el = document.getElementById('uweight');
        console.log(el.value);
        ATON.vroadcast.setWeight(el.value);

        document.getElementById('idMagWeight').innerHTML = el.value;
        };
    ATON.FE.setRank = function(){
        var el = document.getElementById('urank');
        console.log(el.value);
        ATON.vroadcast.setRank(el.value);

        document.getElementById('idRank').innerHTML = el.value;
    };
    ATON.FE.setMagRadius = function(){
        var el = document.getElementById('umagrad');
        console.log(el.value);
        ATON.vroadcast.setMagRadius(el.value);

        document.getElementById('idMagRadius').innerHTML = el.value;
    };
    
    ATON.FE.toggleFirstPerson = function(){
        //var el = document.getElementById('ufp');
        //ATON.setFirstPersonMode(el.checked);
        if (ATON._bFirstPersonMode){
            //$("#idFP").css("background-color","rgba(127,127,127, 0.5)");
            $('#idFP').removeClass("switchedON");
            ATON.setFirstPersonMode(false);
            }
        else {
            $('#idFP').addClass("switchedON");
            ATON.setFirstPersonMode(true);
            }
    };

    ATON.FE.toggleDevOri = function(){
        if (ATON._bDevOri){
            $('#idDevOri').removeClass("switchedON");
            ATON.toggleDeviceOrientation(false);
            }
        else {
            $('#idDevOri').addClass("switchedON");
            ATON.toggleDeviceOrientation(true);
            }
        };

    ATON.FE.toggleFullscreen = function(b){
        if (screenfull.enabled){
            if (b === undefined) screenfull.toggle();
            else {
                if (b) screenfull.request();
                //else
                }
            }
        };
    
    
    ATON.FE.toggleCollisions = function(){
        var el = document.getElementById('bcollisions');
        console.log(el.checked);
        ATON._bUseCollisions = el.checked;
    };
    ATON.FE.toggleGravity = function(){
        var el = document.getElementById('bgravity');
        console.log(el.checked);
        ATON._bUseGravity = el.checked;
    };

    ATON.FE.reqREC = function(dt){
        ATON.FE.ssRec = !ATON.FE.ssRec;

        if (ATON.FE.ssRec){
            //$('#idRecBTN').text("STOP");
            $("#idRecBTN").css("background-color","rgba(255,0,0, 0.5)");
            ATON.vroadcast.requestRecording(dt); // 100
            }
        else {
            //$('#idRecBTN').text("REC");
            $("#idDevOri").css("background-color","rgba(127,127,127, 0.5)");
            ATON.vroadcast.requestRecording();
            }
        };

    ATON.FE.toggleDeviceOrientation = function(){
        var el = document.getElementById('idDevOri');
        ATON.toggleDeviceOrientation(el.checked);
        };

    ATON.FE.buildLayerMenu = function(){
        if (ATON.layers.length == 0) return;

        for (var layername in ATON.layers){
            let checked = "checked";
            if (ATON.layers[layername].getNodeMask() === 0) checked = "";
            //console.log(layername+" : "+checked);

            //$('#idLayers').append('<option value="' + key + '">' + key + '</option>');
            $('#idLayers').append('<input type="checkbox" name="Layers" onchange=\'ATON.vroadcast.switchLayer("'+layername+'", this.checked)\' '+checked+' >'+layername+'<br>');
            }

        //$('#idLayers').append('<button type="button" class="atonBTN" style="width:100%" onclick="ATON.requestPOVbyActiveLayers()">Focus</button>');
        //$('#idLayers').append('<input type="checkbox" name="idIsolateLayer">Isolate');
        };

    ATON.FE.buildPOVmenu = function(){
        let povlen = ATON.POVlist.length;
        if (povlen == 0) return;

        for (let p = 0; p < povlen; p++) {
            const pov = ATON.POVlist[p];
            
            $('#idPOVlist').append("<div style='width:100%' onclick='ATON.requestPOVbyIndex( "+p+" );' ><img src='../res/ii-inv-pov.png' style='width:16px; height:auto'>POV #"+p+"</div>");
            }
        };

    ATON.FE.filterRecords = function(){
        if (ATON.tracer === undefined) return;

        ATON.tracer._tNorm = parseFloat($("#uSessionTime").val());
        ATON.tracer._tRad  = parseFloat($("#uSessionTRad").val());

        if (ATON.tracer._groupVRC === undefined){ // HACK: just for QUSV and SIGs
            $('#idT').html((ATON.tracer._tNorm).toFixed(2));
            $('#idTR').html((ATON.tracer._tRad).toFixed(1));
    
            ATON._mainSS.getUniform('uQVslider').setFloat( ATON.tracer._tNorm );
            ATON._mainSS.getUniform('uQVradius').setFloat( ATON.tracer._tRad );
            }
        else {
            ATON.tracer.filter();

            $('#idT').html(parseInt(ATON.tracer.tminutes) + "\' " + parseInt(ATON.tracer.tseconds) + "\'\'");
            $('#idTR').html(ATON.tracer._tRad.toFixed(1) + "\'\'");
            }
        };

    ATON.FE.search = function(){
        var string = $('#idSearch').val();

        if (string.length < 2) return;

        //console.log("Searching "+string);

        var i = undefined;
        for (var key in ATON.descriptors){
            const D = ATON.descriptors[key];

            var keywords = key.split(" ");
            //console.log(keywords);

            for (k = 0; k < keywords.length; k++){
                var kw = keywords[k];
                if (kw.startsWith(string)) i = key;
                }
            }

        if (i){
            console.log(i);
            if (ATON.descriptors[i]._onSelect) ATON.descriptors[i]._onSelect();  
            else ATON.requestPOVbyDescriptor(i, 0.5);
            }
        };

    $('#idSearch').on('keyup', ATON.FE.search );
};

ATON.FE.selectLayerMenu = function(layername){
    if (layername === "__ALL__"){
        ATON.switchAllLayers(true);
        return;
        }
    if (layername === "__NONE__"){
        ATON.switchAllLayers(false);
        return;
        }

    ATON.isolateLayer(layername);
    //ATON.gotoLayer(layername, 0.5);
};

ATON.FE.logPOV = function(){
    console.log(
        "&pov="+
        ATON._currPOV.pos[0].toFixed(2)+","+
        ATON._currPOV.pos[1].toFixed(2)+","+
        ATON._currPOV.pos[2].toFixed(2)+","+
        ATON._currPOV.target[0].toFixed(2)+","+
        ATON._currPOV.target[1].toFixed(2)+","+
        ATON._currPOV.target[2].toFixed(2)
    );
};

ATON.FE.showNoteModal = function(){
Swal.fire({
  title: 'New ShapeDescriptor ID',
  text: "Adding in ("+ATON._hoveredVisData.p[0].toFixed(2)+","+ATON._hoveredVisData.p[1].toFixed(2)+","+ATON._hoveredVisData.p[2].toFixed(2)+") with radius = "+ATON._hoverRadius,
  background: '#000',
  //type: 'info',
  input: 'text',
  inputPlaceholder: 'annotation',
  confirmButtonText: 'ADD'
}).then((result)=>{
    let did = result.value;
    if (!did || did.length <3) return;

    let D = ATON.addSphereDescriptor(did,"TITLE", ATON._hoveredVisData.p, ATON._hoverRadius);

    let P = ATON.getCurrentPOVcopy();

    D._onSelect = function(){ ATON.requestPOV(P); };

    console.log("Added SphereDescriptor: "+did);
});

/*
    Swal.fire({
        title: 'Enter ShapeDescriptor name',
        input: 'text',
        inputValue: inputValue,
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value || value.length <3) return;

            let D = ATON.addSphereDescriptor(value,"TITLE", ATON._hoveredVisData.p, ATON._hoverRadius);

            let P = ATON.getCurrentPOVcopy();

            D._onSelect = function(){ ATON.requestPOV(P); };

            console.log("Added SphereDescriptor"+did);
            }
        });
*/
};

ATON.FE.attachListeners = function(){
	$(function() {
		$(document).keydown(function(e){
	    	if (e.key == 'c'){
				ATON.FE.logPOV();
                }

            if (e.key == 'i'){
                if (ATON._hoveredVisData){
                    ATON.FE.showNoteModal();

/*
                    var did = prompt("ShapeDescriptor name", "sphere");
                    if (did && did.length > 2){
                        let D = ATON.addSphereDescriptor(did,"TITLE", ATON._hoveredVisData.p, ATON._hoverRadius);

                        let P = ATON.getCurrentPOVcopy();

                        D._onSelect = function(){ ATON.requestPOV(P); };

                        console.log("Added SphereDescriptor"+did);
                        }
*/
                    }
                }

	    	if (e.key == 'p'){
                ATON.addPOV( ATON.getCurrentPOVcopy() );

                let povid = ATON.POVlist.length - 1;
                $('#idPOVlist').append("<div class='atonMenuEntry' onclick='ATON.requestPOVbyIndex( "+povid+" );' ><img src='../res/ii-inv-pov.png' style='width:16px; height:auto'>POV #"+povid+"</div>");

                console.log(ATON._currPOV);
	    		}

            if (e.key == '.'){
                if (ATON._hoveredVisData){
                    ATON.FE._growVolume.expandByVec3(ATON._hoveredVisData.p);
                    //console.log("Volume min: "+ATON.FE._growVolume.getMin());
                    //console.log("Volume max: "+ATON.FE._growVolume.getMax());
                    console.log("Vol position: ["+
                        ATON.FE._growVolume.getMin()[0].toFixed(2)+","+
                        ATON.FE._growVolume.getMin()[1].toFixed(2)+","+
                        ATON.FE._growVolume.getMin()[2].toFixed(2)+"]"
                        );
                    console.log("Vol extents: ["+
                        (ATON.FE._growVolume.getMax()[0]-ATON.FE._growVolume.getMin()[0]).toFixed(2)+","+
                        (ATON.FE._growVolume.getMax()[1]-ATON.FE._growVolume.getMin()[1]).toFixed(2)+","+
                        (ATON.FE._growVolume.getMax()[2]-ATON.FE._growVolume.getMin()[2]).toFixed(2)+"]"
                        );
                    }
                }
/*                
            if (e.keyCode == 77){ // m
                var M = new ATON.magNode();

                M.setTarget(ATON._hoveredVisData.p.slice(0));
                M.setPosition(ATON._currPOV.pos.slice(0));

                var d = osg.vec3.squaredDistance(ATON._hoveredVisData.p, ATON._currPOV.pos);
                M.setRadius( Math.sqrt(d) );
                M.setKernel(0.0);

                M.forces[0] = 0.0;
                M.forces[1] = 0.02;

                ATON.addMagNode(M);
                }

            if (e.keyCode == 13){ // enter
                var jMag = JSON.stringify(ATON.MagNet);
                console.log(jMag);

                console.log(JSON.parse(jMag));
                }
*/
/*
            if (e.keyCode == 70){ // f
                ATON.vroadcast.toggleFocusPolarization();

                if (ATON.vroadcast._bQFpol) $("#idPOL").css("background-color","green");
                else $("#idPOL").css("background-color","black");
                }
*/
            if (e.key == 'x'){
                ATON.vroadcast._bQFpol = true;
                //ATON.setDim(0.2);
                auPOL.play();
                }

            if (e.key == 'r'){
                console.log("Req QPA...");
                if (QPV) ATON.vroadcast.requestPol();
                }   

            });

        // UP
        $(document).keyup(function(e){
            if (e.key == 'x'){ // x
                ATON.vroadcast._bQFpol = false;
                //$("#idPOL").css("background-color","black");
                ATON.setDim(1.0);
                auPOL.pause();

                if (QPV) ATON.vroadcast.requestPol();
                }   
            });
        });
};

/*===============================================
TODO: move
===============================================*/
var PolNav = function(){
    //ATON._polPos = undefined;
    if (ATON._isMobile) return; // FIXME: mobile canvas

    var qfv = ATON.QVhandler.getActiveQV();
    if (qfv === undefined) return;
    if (qfv._qvaLoading) return;

    if (ATON._hoveredVisData === undefined) return;
    if (ATON.vroadcast._bQFpol) return;

    // TODO: use ATON.FE.QVhoverValue
    var v = qfv.getRGBAfromLocation(ATON._hoveredVisData.p);
    if (v[3] <= 0){
        if (ATON._polForce > 0.0) ATON._polForce -= 0.0001;
        /*
        ATON._polForce = 0.0;
        return;
        */
        }
    else {
        // DEBUG_PCELLS
        //console.log("Sensed Cell: "+v);
        ATON._qpVal = v.slice(0);
        if (ATON._polForce < 0.01) ATON._polForce += 0.00005;
        }

    //=== absolute loc
    var newPolPos = qfv.getWorldLocationFromRGB( ATON._qpVal[0],ATON._qpVal[1],ATON._qpVal[2] );

    //=== delta
    //var voxPos = qfv.getQuantizedWorldLocation(ATON._hoveredVisData.p);
    //var newPolPos = osg.vec3.sub([], voxPos/*ATON._hoveredVisData.p*/, qfv.getDeltaFromRGB( ATON._qpVal[0],ATON._qpVal[1],ATON._qpVal[2]));



    ATON._polPos = newPolPos;
    //if (ATON._polPos === undefined) ATON._polPos = newPolPos;
    //else ATON._polPos = osg.vec3.lerp([], newPolPos, ATON._polPos, 0.5);

/*
    if (ATON._polPos === undefined) ATON._polPos = newPolPos;
    else ATON._polPos = osg.vec3.lerp( [], newPolPos, ATON._polPos, 0.8);
*/  
    //if (ATON._polPos === undefined) return;

    var pForce = ATON._polForce * (ATON._qpVal[3]/255.0);

    // Distance-based
/*  var d2 = osg.vec3.squaredDistance(ATON._hoveredVisData.p, ATON._currPOV.pos);
    if (d2 < 100.0) pForce *= (1.0 - (d2 / 100.0)); // 10 m
    else pForce = 0.0;
*/
    // Angle-based
    var polDir = osg.vec3.sub([], ATON._hoveredVisData.p,ATON._polPos);
    osg.vec3.normalize(polDir,polDir);
    var dotPol = osg.vec3.dot(ATON._direction, polDir);

    if (dotPol < 0.2) pForce = 0.0;
    else pForce *= dotPol;

    if (pForce < 0.0) pForce = 0.0;

    //console.log(dotPol);

    if (ATON._bFirstPersonMode){
        if (!ATON._vrState){
            ATON._currPOV.pos = osg.vec3.lerp( [], ATON._currPOV.pos, ATON._polPos, pForce);
            }
        //ATON._currPOV.pos    = osg.vec3.lerp( [], ATON._currPOV.pos, ft, ATON._polForce*(v[3]/255.0));
        }
    else {
        ATON._currPOV.pos    = osg.vec3.lerp( [], ATON._currPOV.pos, ATON._polPos, pForce);
        ATON._currPOV.target = osg.vec3.lerp( [], ATON._currPOV.target, ATON._hoveredVisData.p, pForce);
        }

    //if (ATON.vroadcast._audioLibPol) ATON.vroadcast._audioLibPol.volume = pForce;

    /*  Position 2 Focus
    ------------------
    var v = qfv.getRGBAfromLocation(ATON._currPOV.pos);
    if (v === undefined || v[3] <= 0) return; // outside or null

    var ft = qfv.getWorldLocationFromRGB( v[0],v[1],v[2] );
    //console.log(ft);

    var conv = 0.01; // strenght
    ATON._currPOV.target = osg.vec3.lerp( [], ATON._currPOV.target, ft, conv*(v[3]/255.0));
*/
};

// QVA
ATON.FE.QVArequestNew = function(qv, url){
    if (!ATON.vroadcast._bPOLdirty) return;

    qv.loadQVAimg(url+"?"+new Date().getTime());
    if (!ATON.vroadcast._bQFpol) ATON.vroadcast._bPOLdirty = false;
};

ATON.polarizedAffordance = function(){

    var qfv = ATON.QVhandler.getActiveQV();
    if (qfv === undefined) return;
    
    if (ATON._hoveredVisData === undefined) return;

    ATON.FE.QVhoverValue = qfv.getRGBAfromLocation(ATON._hoveredVisData.p);
    if (ATON.FE.QVhoverValue === undefined) return;

    var pval = ATON.FE.QVhoverValue[3] / 255.0;

    if (pval <= 0.0){
        ATON._surfAff = 0.0;
        //ATON._bSurfAffordable = false;
        //ATON._mainSS.getUniform('uHover').setFloat4([1.0,0.0,0.0, ATON._hoverRadius]);
        }
    else {
        ATON._surfAff = 1.0; //Math.max(ATON._surfAff, pval);
        ATON._bSurfAffordable = true;
        ATON._hoverColor[0] = 0.0;
        ATON._hoverColor[1] = 1.0;
        ATON._hoverColor[2] = 1.0;
        //ATON._mainSS.getUniform('uHoverColor').setFloat4([0.0,1.0,1.0, 1.0]);
        }
   
};




// MAIN =============================================================================
window.addEventListener( 'load', function () {

    ATON.FE.setupPage();

    // First we grab canvas element
    var canvas = document.getElementById( 'View' );

    // Realize
    ATON.shadersFolder = "../shaders";
    ATON.realize(canvas);

    // Mobile/Desktop Config
    if (ATON._isMobile){
        $('#idDevOri').show();
        //ATON._bQueryAxisAligned = true;
        }
    else {
        $('#idDevOri').hide();
        }

    // home
    //ATON.setHome([9.39,-12.22,4.78], [0.028,-0.43,2.77]);
    //ATON.setHome([-5.23,4.38,10], [0.028,-0.43,0.0] );
    //ATON.setHome([-0.58,-0.287,1.5], [-6.0,-2.87,1.5]);

    // Sample POV
/*
    var p = new ATON.pov("Anfora");
    p.pos    = [-1.0,-1.2,2.4];
    p.target = [-0.5,0.2,2.0];
    p.fov    = 90.0;
    p.classList = ["detail", "anfora"];

    ATON.addPOV(p);
*/

    var scenename = undefined;

    var lpParam = ATON.utils.getURLparams().lp;
    if (lpParam) ATON.addLightProbe("../LP/"+lpParam);


    var assetParam = ATON.utils.getURLparams().m;
    if (assetParam){
        var assets = assetParam.split(',');

        assets.forEach(asset => {
            switch (asset){
                case "faug":
                    scenename = "faug";
                    ATON.toggleAOPass(true);

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug/floor.osgjs", { layer: "FAUG" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug/walls.osgjs", { layer: "FAUG" });

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug/exedrae.osgjs", { layer: "FAUG" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug/rooves.osgjs", { layer: "FAUG" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug/temple_exterior.osgjs", { layer: "FAUG" });

                    ATON.setHome([0.0,100,130],[0.0,18.53,7.94]);

                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", ()=>{ QPV = ATON.QVhandler.getActiveQV(); });
                    break;

                case "faug2":
                    scenename = "faug2";
                    //ATON.addLightProbe("../LP/default");
                    
                    let pastDirOld = ATON.FE.MODELS_ROOT+"_prv/faug2/PAST/";
                    let pastDir = ATON.FE.MODELS_ROOT+"_prv/faug2/PAST2/";
                    let dSS = ATON._groupDescriptors.getOrCreateStateSet();
/*
                    ATON.addDescriptor(pastDir+"temple_podium/root.osgjs", "podium", { color: [1,0,0, 1] });
                    ATON.addDescriptor(pastDir+"temple_exterior/root.osgjs", "temple", { color: [1,0,0, 1] });
                    ATON.addDescriptor(pastDir+"temple_entrance/root.osgjs", "entrance", { color: [1,0,0, 1] });
                    ATON.addDescriptor(pastDir+"temple_columns/root.osgjs", "columns", { color: [1,0,0, 1] });
                    ATON.addDescriptor(pastDir+"temple_roof/root.osgjs", "roof", { color: [1,0,0, 1] });
*/
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug2/MODERN/ruins/root.osgjs", { layer: "MODERN" });

                    ATON.setHome([-7.76,15.78,7.19],[9.90,-13.38,5.83]);
/*
                    var qv = ATON.QVhandler.addQV([-70,-50,0], [150,70,50]);
                    qv.loadQVAimg("../services/record/faug2/qfv.png");
                    
                    console.log(qv.getResolution());
*/

                    //ATON.addNewLayer("Reconstruction");
                    //let opts = { layer: "Reconstruction" };

                    ATON.addGraph(pastDir+"colossus_hall_m.osgjs", { layer: "ColossusHall" });
                    ATON.addGraph(pastDir+"augustus_m.osgjs", { layer: "ColossusHall" });

                    ATON.addGraph(pastDir+"main_floor_m.osgjs", { layer: "Forum" });
                    
                    ATON.addGraph(pastDir+"postguard_m.osgjs", { layer: "PostGuard" });

                    ATON.addGraph(pastDir+"temple_columns_m.osgjs", { layer: "MarsTemple" });
                    ATON.addGraph(pastDir+"temple_entrance_m.osgjs", { layer: "MarsTemple" });
                    ATON.addGraph(pastDir+"temple_exterior_m.osgjs", { layer: "MarsTemple" });
                    ATON.addGraph(pastDir+"temple_frieze_m.osgjs", { layer: "MarsTemple" });
                    ATON.addGraph(pastDir+"temple_podium_m.osgjs", { layer: "MarsTemple" });
                    ATON.addGraph(pastDir+"temple_roof_m.osgjs", { layer: "MarsTemple" });
                    ATON.addGraph(pastDir+"temple_altar_m.osgjs", { layer: "MarsTemple" });
                    ATON.addGraph(pastDir+"interior_m.osgjs", { layer: "MarsTemple" });

                    ATON.addGraph(pastDir+"porticos_colonnade_R_m.osgjs", { layer: "Portico_R" });
                    ATON.addGraph(pastDir+"porticos_floor_R_m.osgjs", { layer: "Portico_R" });

                    ATON.addGraph(pastDir+"porticos_colonnade_L_m.osgjs", { layer: "Portico_L" });
                    ATON.addGraph(pastDir+"porticos_floor_L_m.osgjs", { layer: "Portico_L" });
                    
/*
                    ATON.addGraph(pastDirOld+"temple_podium/root.osgjs", { layer: "Hypothesis_2" });
                    ATON.addGraph(pastDirOld+"temple_exterior/root.osgjs", { layer: "Hypothesis_2" });
                    ATON.addGraph(pastDirOld+"temple_entrance/root.osgjs", { layer: "Hypothesis_2" });
                    ATON.addGraph(pastDirOld+"temple_columns/root.osgjs", { layer: "Hypothesis_2" });
                    ATON.addGraph(pastDirOld+"temple_roof/root.osgjs", { layer: "Hypothesis_2" });
*/
                    ATON.switchLayer("Forum", false);
                    ATON.switchLayer("PostGuard", false);
                    ATON.switchLayer("ColossusHall", false);
                    ATON.switchLayer("MarsTemple", false);
                    ATON.switchLayer("Portico_R", false);
                    ATON.switchLayer("Portico_L", false);



                    dSS.setAttributeAndModes(
                        new osg.CullFace( 'DISABLE' ), //new osg.CullFace( 'BACK' ),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.PROTECTED
                        );
/*
                    dSS.setAttributeAndModes( 
                        new osg.Depth( osg.Depth.ALWAYS ),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.PROTECTED
                        );
*/
/*   
                    dSS.setAttributeAndModes( 
                        //new osg.BlendFunc(osg.BlendFunc.SRC_ALPHA, osg.BlendFunc.ZERO), // additive
                        new osg.BlendFunc(osg.BlendFunc.SRC_COLOR, osg.BlendFunc.DST_COLOR), 
                        osg.StateAttribute.ON | osg.StateAttribute.OVERRIDE
                        );
*/

/*
                    ATON.QVhandler.setPositionAndExtents([-70,-50,0], [150,70,50]);
                    //ATON.QVhandler.loadILSign("../services/record/faug2/_hold-qfv-blur.jpg");
                    ATON.QVhandler.loadQVASign("../services/record/faug2/qfv.png");
*/
                    //console.log(JSON.stringify(ATON.QVhandler));

                    var thit = 0;
                    // CUSTOM KEYBOARD
                    $(function() {
                        $(document).keydown(function(e) {
                            if (e.keyCode == 84){ // t
                                e.preventDefault();

                                if (thit==0) ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug2/PAST/temple_podium/root.osgjs", { layer: "PAST" });
                                if (thit==1) ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug2/PAST/temple_exterior/root.osgjs", { layer: "PAST" });
                                if (thit==2) ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug2/PAST/temple_entrance/root.osgjs", { layer: "PAST" });
                                if (thit==3) ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug2/PAST/temple_columns/root.osgjs", { layer: "PAST" });
                                //if (thit==4) ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/faug2/PAST/temple_roof/root.osgjs", { layer: "PAST" });

                                thit++;
                                }
                            if (e.keyCode == 220){ // \
                                //ATON.QVhandler.loadQVASign("../services/record/faug2/qfv.png?"+new Date().getTime());
                                qv.loadQVAimg("../services/record/faug2/qfv.png?"+new Date().getTime());
                                //console.log("QFV reloaded");
                                }

                            if (e.keyCode == 71){
                                var v = qv.getRGBAfromLocation(ATON._currPOV.pos);
                                if (v[3] > 0) console.log( qv.getWorldLocationFromRGB( v[0],v[1],v[2] ));
                                }
                            });
                        });
                    break;

                case "fpacis":
                    scenename = "fpacis";
                    ATON.toggleAOPass(true);

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/fpacis/01.osgjs", { layer: "FPACIS" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/fpacis/02.osgjs", { layer: "FPACIS" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/fpacis/03.osgjs", { layer: "FPACIS" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/fpacis/04.osgjs", { layer: "FPACIS" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/fpacis/05.osgjs", { layer: "FPACIS" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/fpacis/06.osgjs", { layer: "FPACIS" });

                    ATON.setHome([107.32,-23.23,-2.47],[109.05,-53.63,1.15]);

                    
                    ////ATON.QVhandler.setPositionAndExtents([-26, -58.0, -5.0], [142.5, 50.0, 30.0]); // TOT
                    //ATON.QVhandler.setPositionAndExtents([92, -50.0, -5.0], [25, 32.5, 30.0]); // Lib

                    //ATON.QVhandler.loadILSign("../models/_prv/_QUSV/pacis/P-qils.png");
                    ////ATON.addILSign("../models/_prv/_QUSV/pacis/P_GLOB-TP0.png");
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){
                        QPV = ATON.QVhandler.getActiveQV();
                        });
                    break;

                case "sarmi":
                    scenename = "sarmi";
                    
                    for (let i = 1; i <= 7; i++) ATON.addGraph(ATON.FE.MODELS_ROOT+"../models/_prv/sarmi/part-0"+i+".osgjs", { layer: "LANDSCAPE" });

                    for (let i = 1; i <= 6; i++) ATON.addGraph(ATON.FE.MODELS_ROOT+"../models/_prv/sarmi/LOD1_DP_Hor_"+i+".osgjs", { layer: "LANDSCAPE" });
                    for (let i = 1; i <= 6; i++) ATON.addGraph(ATON.FE.MODELS_ROOT+"../models/_prv/sarmi/r-LOD3_DP_Ter_"+i+".osgjs", { layer: "LANDSCAPE" });

                    ATON.setHome([111.72,160.66,15.20],[34.22,146.66,-11.13]);

                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){
                        QPV = ATON.QVhandler.getActiveQV();
                        });
                    break;

                case "complex":
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"complex/Capriata1.osgjs", { layer: "COMPLEX", transformRules: ATON.FE.MODELS_ROOT+"complex/Capriata1-inst.txt" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/corcol/root.osgjs",{ layer: "COMPLEX", transformRules: ATON.FE.MODELS_ROOT+"complex/ColonnaCorinzia-inst.txt" });
                    break;
                
                case "sqcolumns":
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/table/TavoloEsedra.glb", { layer: "COLUMNS", transformRules: ATON.FE.MODELS_ROOT+"tl-square-4x.txt" });
                    break;

                case "groundx":
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"ground/root.osgjs", { layer: "GROUND", transformRules: ATON.FE.MODELS_ROOT+"ground/tl-grid.txt" });
                    break;

                case "armoury":
                    scenename = "armoury";
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/armoury/root.osgjs", { layer: "MAIN" });

                    ATON.transformLayerByMatrix("MAIN", osg.mat4.fromScaling( [], [0.25,0.25,0.25]));
                    
                    ATON.setHome([1.53,-1.57,1.54],[0.17,0.08,1.63]);
                    break;

                case "picgallery":
                    scenename = "picgallery";
                    //ATON.addLightProbe("../LP/w");

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/picgallery/root.osgjs", { layer: "MAIN" });
                    ATON.setHome([-2.67,-10.09,2.46],[0.28,-1.69,1.62]);

                    ATON._polarizeLocomotionQV = PolNav;
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){
                        QPV = ATON.QVhandler.getActiveQV();
                        });
                    break;

                case "dining":
                    scenename = "dining";

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/dining-room/root.osgjs", { layer: "MAIN" });
                    ATON.transformLayerByMatrix("MAIN", osg.mat4.fromScaling( [], [0.5,0.5,0.5]));
                    ATON.setHome([-4.00,-3.50,2.55],[0.21,2.01,2.61]);


                    //QPV = ATON.QVhandler.addQV([-2.6, -2.1, 0.4], [4, 4.2, 2.0]);
                    //QPV = ATON.QVhandler.addQV([-6, -7.5, 0.4], [12.0, 14.0, 7.3]);
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){
                        QPV = ATON.QVhandler.getActiveQV();
                        });
                    break;

                case "vestibule":
                    scenename = "vestibule";

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/upper-vestibule/root.osgjs", { layer: "MAIN" });
                    ATON.transformLayerByMatrix("MAIN", osg.mat4.fromScaling( [], [0.35,0.35,0.35]));
                    ATON.setHome([-1.64,3.12,1.15],[0.16,2.20,0.96]);

                    //QPV = ATON.QVhandler.addQV([-5, -5.5, 0.0], [13.0, 10, 11.8]);
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){
                        QPV = ATON.QVhandler.getActiveQV();
                        });
                    break;

                case "smoking":
                    scenename = "smoking";

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/smoking-room/root.osgjs", { layer: "MAIN" });
                    ATON.transformLayerByMatrix("MAIN", osg.mat4.fromScaling( [], [0.3,0.3,0.3]));
                    ATON.setHome([0.33,1.02,1.93],[-0.41,-0.46,1.58]);

                    //ATON.QVhandler.setPositionAndExtents([-5, -5.5, 0.0], [13.0, 10, 11.8]);
                    
                    //ATON.QVhandler.loadILSign("../models/_prv/_QUSV/smoking/F-qils.png");
                    //ATON.QVhandler.loadILSign("../models/_prv/_QUSV/smoking/P-qils.png");
                    //ATON.QVhandler.loadILSign("../models/_prv/_QUSV/smoking/F_GLOB-TP0.png");
                    //ATON.QVhandler.loadILSign("../models/_prv/_QUSV/smoking/P_GLOB-TP0.png");

                    ATON._polarizeLocomotionQV = PolNav;
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){
                        QPV = ATON.QVhandler.getActiveQV();
                        });

                    break;

                case "test_pol":
                    scenename = "test_pol";

                    ATON.addLightProbe("../LP/default");

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"ground/root.osgjs", { layer: "Ground" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"ground/border.osgjs", { layer: "Ground", transformRules: ATON.FE.MODELS_ROOT+"ground/tl-border.txt" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/corcol/root.osgjs", { layer: "Columns", transformRules: ATON.FE.MODELS_ROOT+"tl-square-cols.txt" });
                    //ATON.addGraph(ATON.FE.MODELS_ROOT+"column/column.gltf", { layer: "Columns", transformRules: ATON.FE.MODELS_ROOT+"tl-square-cols.txt" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"hebe/root.osgjs", { layer: "Hebe" });

                    ATON._mainSS.getUniform('uFogDistance').setFloat( 60.0 );
                    //$('body').css('background-color', 'black');

                    ATON.setHome([-0.28,-19.14,2.87],[-0.30,-0.39,4.58]);
                    ATON.requestHome(0.01);

                    ATON._polarizeLocomotionQV = PolNav;
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){ QPV = ATON.QVhandler.getActiveQV(); });
                    break;

                case "test_cap":
                    scenename = "test_cap";

                    //ATON.addLightProbe("../LP/default");

                    //ATON.addGraph(ATON.FE.MODELS_ROOT+"ground/base.osgjs", { layer: "Ground" });
                    ATON.addNewLayer("Ground");

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/capitoline/centauro658/root.osgjs", { layer: "Item" });
                    //ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/capitoline/altare/root.osgjs", { layer: "Item" });
                    //ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/capitoline/baseciccio/root.osgjs", { layer: "Item" });
                    //ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/capitoline/ermavat/root.osgjs", { layer: "Item" });
                    //ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/capitoline/galata/root.osgjs", { layer: "Item" });

                    ATON.on("NodeRequestCompleted",()=>{
                        var itemL = ATON.getLayer("Item");
                        var iC = itemL.getBoundingSphere()._center;
                        var iR = itemL.getBoundingSphere()._radius;

                        var xMin = iC[0] - iR;
                        var xMax = iC[0] + iR;
                        var yMin = iC[1] - iR;
                        var yMax = iC[1] + iR;
                        var zMin = iC[2] - iR;

                        var G = osg.createTexturedQuadGeometry(
                            xMin, yMin, zMin,   // corner
                            xMax-xMin, 0, 0.0,       // width
                            0, yMax-yMin, 0.0 );     // height

                        osgDB.readImageURL(ATON.FE.MODELS_ROOT+"ground/base.jpg").then( function ( data ){
                            var bgTex = new osg.Texture();
                            bgTex.setImage( data );
                    
                            bgTex.setMinFilter( osg.Texture.LINEAR_MIPMAP_LINEAR );
                            bgTex.setMagFilter( osg.Texture.LINEAR );
                            
                            bgTex.setWrapS( osg.Texture.CLAMP_TO_EDGE );
                            bgTex.setWrapT( osg.Texture.CLAMP_TO_EDGE );
                    
                            G.getOrCreateStateSet().setTextureAttributeAndModes(0, bgTex);
                            });

                        ATON.getLayer("Ground").addChild(G);
                        
                        //ATON.translateLayer("Item", [-iC[0],-iC[1],-zMin]);
                        ATON._buildKDTree(ATON._groupVisible);
                        });

                    ATON._mainSS.getUniform('uFogDistance').setFloat( 90.0 );
                    $('body').css('background-color', 'rgb(65,70,79)');
                    ATON.setFogColor(osg.vec4.fromValues(0.25,0.27,0.3, 0.0));

                    ATON.setHome([-0.05,-1.63,1.16],[0.0,0.0,0.3]);
                    ATON.requestHome(0.01);

                    ATON._polarizeLocomotionQV = PolNav;
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){ QPV = ATON.QVhandler.getActiveQV(); });
                    break;

                case "test1":
                    scenename = "test1";
                    ATON.addLightProbe("../LP/default");

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"ground/root.osgjs", { layer: "Ground" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"ground/border.osgjs", { layer: "Ground", transformRules: ATON.FE.MODELS_ROOT+"ground/tl-border.txt" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/corcol/root.osgjs", { layer: "Columns", transformRules: ATON.FE.MODELS_ROOT+"tl-square-cols.txt" });
                    //ATON.addGraph(ATON.FE.MODELS_ROOT+"column/column.gltf", { layer: "Columns", transformRules: ATON.FE.MODELS_ROOT+"tl-square-cols.txt" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"hebe/root.osgjs", { layer: "Hebe" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"tree1/root.osgjs", { layer: "Vegetation", transformRules: ATON.FE.MODELS_ROOT+"tl-trees.txt" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"atoncube/root.osgjs", { layer: "Cubes", transformRules: ATON.FE.MODELS_ROOT+"tl-square-groundcubes.txt" });

                    ATON.setLayerMask("Vegetation", ATON._maskLP);

                    // test QV
                    /*
                    ATON.addDescriptor(ATON.FE.MODELS_ROOT+"_shapes/cube/root.osgjs", "hebe-box", { 
                        transformRules: ATON.FE.MODELS_ROOT+"tl-hebe-qv.txt" 
                        });
*/
                    var trSS = ATON.layers["Vegetation"].getOrCreateStateSet();
                    trSS.setAttributeAndModes( 
                        new osg.Depth( osg.Depth.LESS ),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.OVERRIDE
                        );
                    trSS.setAttributeAndModes( 
                        new osg.BlendFunc(osg.BlendFunc.SRC_ALPHA, osg.BlendFunc.ONE_MINUS_SRC_ALPHA),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.OVERRIDE
                        );
/*
                    trSS.setAttributeAndModes( 
                        //new osg.BlendFunc(osg.BlendFunc.SRC_ALPHA, osg.BlendFunc.ONE), 
                        new osg.BlendFunc(osg.BlendFunc.SRC_ALPHA, osg.BlendFunc.DST_ALPHA), 
                        osg.StateAttribute.ON | osg.StateAttribute.OVERRIDE
                        );
*/
                    ATON._mainSS.getUniform('uFogDistance').setFloat( 60.0 );
                    //$('body').css('background-color', 'black');

                    ATON.setHome([-0.28,-19.14,2.87],[-0.30,-0.39,4.58]);
                    ATON.requestHome(0.01);
                    break;

                case "hebe":
                    scenename = "hebe";
                    QAurl = "../services/record/hebe/qfv.png";

                    ATON._polarizeLocomotionQV = PolNav;

                    ATON.addLightProbe("../LP/default");

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"ground/root.osgjs", { layer: "GROUND" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"hebe/root.osgjs", { layer: "MAIN" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/corcol/root.osgjs", { 
                        layer: "COLUMNS", 
                        transformRules: ATON.FE.MODELS_ROOT+"tl-square-cols.txt"
                        });

                    // TEST descriptors
                    ATON.addDescriptor(ATON.FE.MODELS_ROOT+"_shapes/cube/root.osgjs", "colonne", { 
                        transformRules: ATON.FE.MODELS_ROOT+"tl-square-cols-semshapes.txt",
                        color: [1,0,0, 1] 
                        });
                    ATON.addDescriptor(ATON.FE.MODELS_ROOT+"_shapes/cube/root.osgjs", "capitelli", { 
                        transformRules: ATON.FE.MODELS_ROOT+"tl-square-caps-semshapes.txt",
                        color: [0,1,0, 1] 
                        });
                    ATON.addDescriptor(ATON.FE.MODELS_ROOT+"_shapes/cube/root.osgjs", "basi", { 
                        transformRules: ATON.FE.MODELS_ROOT+"tl-square-bases-semshapes.txt",
                        color: [0,0,1, 1] 
                        });
                    /*
                    ATON.addDescriptor(ATON.FE.MODELS_ROOT+"_shapes/cube/root.osgjs", "statua", { 
                        transformRules: ATON.FE.MODELS_ROOT+"tl-hebe-semshapes.txt" 
                        });
                */
                    //QPV = ATON.QVhandler.addQV([-8.0,-8.0,-0.1], [16,16,6]);
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){
                        QPV = ATON.QVhandler.getActiveQV();
                        });

                    break;

                case "cecilio":
                    scenename = "cecilio";
                    QAurl = "../services/record/cecilio/qfv.png";

                    ATON._polarizeLocomotionQV = PolNav;
                    
                    //ATON.setDim(0.3);
                    //$('body').css('background-color', 'black');
                    //ATON.setFogColor(osg.vec4.fromValues(0.0,0.0,0.0, 0.0));

                    ATON._mainSS.getUniform('uFogDistance').setFloat( 100.0 );

                    ATON.addNewLayer("PRESENT");
/*
                    ATON.addNewLayer("PAST").getOrCreateStateSet().setAttributeAndModes(
                        new osg.CullFace( 'DISABLE' ), //new osg.CullFace( 'BACK' ),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.PROTECTED
                        );

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_a/root.osgjs", { layer: "PAST" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_b/root.osgjs", { layer: "PAST" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_c/root.osgjs", { layer: "PAST" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_d/root.osgjs", { layer: "PAST" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_e/root.osgjs", { layer: "PAST" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_f/root.osgjs", { layer: "PAST" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_g/root.osgjs", { layer: "PAST" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_h/root.osgjs", { layer: "PAST" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_i/root.osgjs", { layer: "PAST" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_l/root.osgjs", { layer: "PAST" });

                    ATON.switchLayer("PAST", false);
*/
                    //ATON.addNewLayer("CEIL","PRESENT");

                    // CUSTOM KEYBOARD
/*
                    $(function() {
                        $(document).keydown(function(e) {
                            if (e.keyCode == 84){ // t
                                e.preventDefault();

                                ATON.switchLayer("PRESENT", false);

                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_a/root.osgjs", { layer: "PAST" });
                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_b/root.osgjs", { layer: "PAST" });
                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_c/root.osgjs", { layer: "PAST" });
                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_d/root.osgjs", { layer: "PAST" });
                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_e/root.osgjs", { layer: "PAST" });
                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_f/root.osgjs", { layer: "PAST" });
                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_g/root.osgjs", { layer: "PAST" });
                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_h/root.osgjs", { layer: "PAST" });
                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_i/root.osgjs", { layer: "PAST" });
                                ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/_rec/room_l/root.osgjs", { layer: "PAST" });
                                }
                            })
                        });
*/
                    // PRESENT
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_a/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_b_S/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_b_N/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_b_E/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_b_floor/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_c/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_d/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_e/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_f/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_g/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_h/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_i/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_l_N/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_l_W/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_l_garden/root.osgjs", { layer: "PRESENT" });
                    
                    //ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_l_ceiling/root.osgjs", { layer: "CEIL" });
                    
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_m_k/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_n/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_o/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_p_q/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_r/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_s/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_t/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_u/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_v/root.osgjs", { layer: "PRESENT" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/cecilio/room_w/root.osgjs", { layer: "PRESENT" });
                    

                    //ATON.translateLayer("CEIL", [0,0,10]);
                    //ATON.switchLayer("PRESENT", false);

                    //QPV = ATON.QVhandler.addQV([-17.0,-41,0], [30,40,20]);
                    //QPV = ATON.QVhandler.addQV([-12.5,-17,0], [9,12,20]); // ingresso
                    //QPV = ATON.QVhandler.addQV([0.0,-34,0.0], [8,7,20]); // stanza x
                    //QPV = ATON.QVhandler.addQV([-5,-7,0], [1.7,1.5,8]); // altarino
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){
                        QPV = ATON.QVhandler.getActiveQV();
                        });

                    //qv.loadQVAimg(QAurl+"?"+new Date().getTime());

                    //ATON.vroadcast.requestPol();
/*
                    setInterval(function(){
                        ATON.FE.QVArequestNew(qv, QAurl);
                        }, 1000);
*/
                    ATON.setHome([-7.88,-2.49,2.19],[-7.87,-3.48,2.07]);
                    ATON.requestHome(0.01);
                    break;

                case "test2":
                    scenename = "TEST2";
                    ATON.setFirstPersonMode(true);

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/karanis/root.osgjs", { layer: "MAIN" });
                    ATON.setHome([-19.82,-20.99,29.27],[-5.43,-20.68,2.10]);
                    break;

                case "ls": // Landscape Services
                    scenename = "LS";

                    ATON._mainSS.getUniform('uFogDistance').setFloat( 20000.0 );

                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/t/dordogne_XIXe_SE20160530/Inrap_test__dordogne_XIXe_SE20160530_L0_X0_Y0_subtile.osgjs", { layer: "XIX" });
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/t/test_dordogne_MC_2016/Inrap_test__test_dordogne_MC_2016_L0_X0_Y0_subtile.osgjs", { layer: "2016" });
                    //ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/t/Test_Dordogne_WebGL_HillShade/inrap__Test_Dordogne_WebGL_HillShade_L0_X0_Y0_subtile.osgjs", { layer: "HS" });

                    var s = 0.003;
                    ATON.transformLayerByMatrix("2016", osg.mat4.fromScaling( [], [s,s,s]));
                    ATON.transformLayerByMatrix("XIX", osg.mat4.fromScaling( [], [s,s,s]));

                    ATON.switchLayer("2016", false);
                    ATON.switchLayer("XIX", true);
                    //ATON.switchLayer("HS", false);

                    ATON.LSswitch = function(id){
                        if (id == 1){
                            ATON.switchLayer("XIX", true);
                            ATON.switchLayer("2016", false);
                            ATON.switchLayer("HS", false);
                            }
                        if (id == 2){
                            ATON.switchLayer("XIX", false);
                            ATON.switchLayer("2016", true);
                            ATON.switchLayer("HS", false);
                            }
                        };

                    ATON.LSzx = function(){
                        var el = document.getElementById('idLSzx');

                        var f = parseFloat(el.value);

                        ATON.transformLayerByMatrix("2016", osg.mat4.fromScaling( [], [s,s,s*f]));
                        ATON.transformLayerByMatrix("XIX", osg.mat4.fromScaling( [], [s,s,s*f]));
                        };

                    $("#idCustomBTNs").append("<button type='button' class='btn btn-info btn-sm' data-toggle='button' aria-pressed='false' onclick='ATON.LSswitch(1)'>XIX</button>");
                    $("#idCustomBTNs").append("<button type='button' class='btn btn-info btn-sm' data-toggle='button' aria-pressed='false' onclick='ATON.LSswitch(2)'>2016</button>");
                    $("#idCustomBTNs").append("<input class='form-control-range' id='idLSzx' type='range' min='1.0' max='8.0' step='0.1' oninput='ATON.LSzx()'>");

                    // CUSTOM KEYBOARD
                    $(function() {
                        $(document).keydown(function(e) {
                            if (e.keyCode == 49){ // 1
                                e.preventDefault();

                                ATON.switchLayer("XIX", true);
                                ATON.switchLayer("2016", false);
                                ATON.switchLayer("HS", false);
                                }
                            if (e.keyCode == 50){ // 2
                                e.preventDefault();

                                ATON.switchLayer("XIX", false);
                                ATON.switchLayer("2016", true);
                                ATON.switchLayer("HS", false);
                                }
                            if (e.keyCode == 51){ // 3
                                e.preventDefault();

                                ATON.switchLayer("XIX", false);
                                ATON.switchLayer("2016", false);
                                ATON.switchLayer("HS", true);
                                }
                            })
                        });


                    //ATON.setHome([-19.82,-20.99,29.27],[-5.43,-20.68,2.10]);
                    break;

                case "ls2":
                    //scenename = "LS2";
                    scenename = "LS3";

                    ATON.LSzx = function(){
                        var el = document.getElementById('idLSzx');
                        var f = parseFloat(el.value);
                        ATON.transformLayerByMatrix("G", osg.mat4.fromScaling( [], [1.0,1.0,f]));
                        };

                    $("#idCustomBTNs").append("<input class='form-control-range' id='idLSzx' type='range' min='1.0' max='8.0' step='0.1' oninput='ATON.LSzx()'>");

                    ATON._mainSS.getUniform('uFogDistance').setFloat( 20000.0 );
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/t/Test_Gorropu_IGM/inrap__Test_Gorropu_IGM_L0_X0_Y0_subtile.osgjs", { layer: "G" });
                    break;

                case "rsm":
                    scenename = "rsm";

                    //ATON.addNewLayer("GLOBAL");
                    //ATON.addNewLayer("Castle","SanMarino");
                    //ATON.addNewLayer("Vegetation","SanMarino");

                    //let rsmTrans = [-295.586,-834.496,-770.0];
                    //ATON.translateLayer("SanMarino",rsmTrans);

                    //ATON.setFirstPersonMode(true);
                    //ATON.addLightProbe("../LP/default");

                    for (let b = 1; b <= 37; b++) ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/rsm/diff1/PT"+b+"__LOD2_m.osgjs", { layer: "Diff" });
                    ATON.switchLayer("Diff", false);

                    if (ATON._isMobile)
                        for (let b = 1; b <= 37; b++) 
                            ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/rsm/prog1/LOD2/PT"+b+"__LOD2_m.osgjs", {layer: "Castle"});

                    else for (let b = 1; b <= 37; b++)
                        ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/rsm/prog1/LOD2/PT"+b+"__LOD2_m.osgjs", { 
                            layer: "Castle",
                            hiresurl: ATON.FE.MODELS_ROOT+"_prv/rsm/prog1/LOD1/PT"+b+"__LOD1_m.osgjs",
                            hirespxsize: 600000
                            });

/*
                    for (let b = 1; b <= 37; b++) {
                        //ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/rsm/PT"+b+"__LOD1/root.osgjs", { layer: "PRESENT" });
                        ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/rsm/PT"+b+"__LOD2/root.osgjs", { 
                            layer: "Castle OLD", 
                            hiresurl: ATON.FE.MODELS_ROOT+"_prv/rsm/PT"+b+"__LOD1/root.osgjs",
                            hirespxsize: 600000
                            });
                        }

                    ATON.switchLayer("Castle OLD", false);
*/

/*
                    ATON.getLayer("Castle").getOrCreateStateSet().setAttributeAndModes(
                        new osg.CullFace( 'DISABLE' ), //new osg.CullFace( 'BACK' ),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.PROTECTED
                        );
*/

                    // veg
                    ATON.addGraph(ATON.FE.MODELS_ROOT+"pine/Branches_m.osgjs", { layer: "Vegetation", transformRules: ATON.FE.MODELS_ROOT+"_prv/rsm/tl-pines.txt" });
                    let vegLayer = ATON.layers["Vegetation"];
                    let vegSS = vegLayer.getOrCreateStateSet();

                    vegSS.setAttributeAndModes(
                        new osg.CullFace( 'DISABLE' ), //new osg.CullFace( 'BACK' ),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.PROTECTED
                        );

                    vegSS.setAttributeAndModes( 
                        new osg.Depth( osg.Depth.LESS ),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.OVERRIDE
                        );

                    vegSS.setAttributeAndModes( 
                        new osg.BlendFunc(osg.BlendFunc.SRC_ALPHA, osg.BlendFunc.ONE_MINUS_SRC_ALPHA),
                        //new osg.BlendFunc(osg.BlendFunc.SRC_ALPHA, osg.BlendFunc.ZERO), // additive
                        //new osg.BlendFunc(osg.BlendFunc.SRC_COLOR, osg.BlendFunc.DST_COLOR), 
                        osg.StateAttribute.ON | osg.StateAttribute.OVERRIDE
                        );

                    ATON.setLayerMask("Vegetation", ATON._maskLP);

                    let diffSS = ATON.layers["Diff"].getOrCreateStateSet();
                    diffSS.setRenderingHint('TRANSPARENT_BIN');
                    diffSS.setAttributeAndModes(
                        new osg.CullFace( 'DISABLE' ), //new osg.CullFace( 'BACK' ),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.PROTECTED
                        );
                    diffSS.setAttributeAndModes( 
                        new osg.Depth( osg.Depth.LESS ),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.OVERRIDE
                        );
                    diffSS.setAttributeAndModes( 
                        new osg.BlendFunc(osg.BlendFunc.SRC_ALPHA, osg.BlendFunc.ZERO),
                        osg.StateAttribute.OVERRIDE | osg.StateAttribute.OVERRIDE
                        );

                    // Custom Keyboard
/*
                    var s = 1.0;
                    $(function() {
                        $(document).keydown(function(e) {
                            if (e.key == 'k'){
                                e.preventDefault();

                                if (s > 0.06) s -= 0.05;
                                //s = 0.1;

                                var M = osg.mat4.create();
                                osg.mat4.multiply(M, M, osg.mat4.fromScaling( [], [s,s,s]));
                                osg.mat4.translate(M, M, rsmTrans );

                                ATON.transformLayerByMatrix("SanMarino", M);

                                //ATON.gotoLayer("Castle", s*0.01, 0.0);
                                }
                            if (e.key == 'l'){
                                e.preventDefault();

                                s = 1.0;

                                ATON.transformLayerByMatrix("Castle", osg.mat4.fromScaling( [], [s,s,s]));
                                ATON.transformLayerByMatrix("Vegetation", osg.mat4.fromScaling( [], [s,s,s]));
                                }
                            });
                        });
*/


                    ATON._polarizeLocomotionQV = PolNav;
                    ATON.QVhandler.addFromJSON(ATON.FE.QV_ROOT+scenename+"-qv.json", function(){
                        QPV = ATON.QVhandler.getActiveQV();
                        });
                    
                    ATON.setHome([262.01,802.84,803.52],[295.16,842.49,778.58]);
                    //ATON.setHome([-34.01,-27.26,30.95],[-4.41,5.53,10.13]);

                    ATON.on("LayerSwitch", function(L){
                        if (L.name === "Diff" && L.value){
                            ATON._mainSS.getUniform('uFogDistance').setFloat( 1000000.0 );
                            $('body').css('background-color', 'rgb(0,0,0)');
                            ATON.setFogColor(osg.vec4.fromValues(0,0,0, 0.0));
                            }
                        else {
                            ATON._mainSS.getUniform('uFogDistance').setFloat( 90.0 );
                            $('body').css('background-color', 'rgb(65,70,79)');
                            ATON.setFogColor(osg.vec4.fromValues(0.25,0.27,0.3, 0.0));
                            }
                        });

                    ATON._mainSS.getUniform('uFogDistance').setFloat( 90.0 );
                    $('body').css('background-color', 'rgb(65,70,79)');
                    ATON.setFogColor(osg.vec4.fromValues(0.25,0.27,0.3, 0.0));

                    ATON.requestHome(0.01);
                    break;

                case "domus":
                    scenename = "domus";

                    for (let b = 1; b <= 7; b++) {
                        ATON.addGraph(ATON.FE.MODELS_ROOT+"domus/_lo-LOD1_DP_Hor_"+b+".osgjs", { 
                            layer: "PRESENT", 
                            hiresurl: ATON.FE.MODELS_ROOT+"domus/LOD1_DP_Hor_"+b+".osgjs",
                            hirespxsize: 200000
                            });
                        }

                    ATON.setHome([-10.52,156.28,1.37],[5.33,168.50,-1.63]);
                    ATON._mainSS.getUniform('uFogDistance').setFloat( 120.0 );

                    break;

                    case "nora":
                        scenename = "nora";
                        ATON.addLightProbe("../LP/default");
                        let pgSS = ATON._groupDescriptors.getOrCreateStateSet();

                        let proxiesdir = ATON.FE.MODELS_ROOT+"_prv/nora/proxies/";
                        let colUSVs = [0,1,0, 1]; //[0.031, 0.191, 0.026, 1];
                        let colUSVn = [0,0,1, 1]; //[0.018, 0.275, 0.799, 1];
                        let colSF = [1,1,0, 1];

                        ATON.addDescriptor(proxiesdir+"USV03_m.osgjs", "USV03", { color: colUSVs });
                        ATON.addDescriptor(proxiesdir+"USV06_m.osgjs", "USV06", { color: colUSVs });
                        ATON.addDescriptor(proxiesdir+"USV07_m.osgjs", "USV07", { color: colSF });
/*
                        pgSS.setAttributeAndModes(
                            new osg.CullFace( 'DISABLE' ), //new osg.CullFace( 'BACK' ),
                            osg.StateAttribute.OVERRIDE | osg.StateAttribute.PROTECTED
                            );
*/
/*
                        pgSS.setAttributeAndModes( 
                            new osg.BlendFunc(osg.BlendFunc.SRC_ALPHA, osg.BlendFunc.ZERO), // additive
                            //new osg.BlendFunc(osg.BlendFunc.SRC_COLOR, osg.BlendFunc.DST_COLOR), 
                            osg.StateAttribute.ON | osg.StateAttribute.OVERRIDE
                            );
*/
                        //ATON.addGraph(proxiesdir+"USV03_m.osgjs", { layer: "REC", });
                        ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/nora/period4/recinto_test_m.osgjs", { layer: "Period_4" });

                        ATON.addGraph(ATON.FE.MODELS_ROOT+"_prv/nora/today/Tempio_foro_3003_decim0.3__m.osgjs", { layer: "Today" });


                        ATON.setHome([4.26,51.41,16.12],[9.16,68.64,6.35]);
                        ATON.requestHome(0.01);

                        //ATON._mainSS.getUniform('uFogDistance').setFloat( 900.0 );
                        //$('body').css('background-color', 'rgb(0,0,0)');
                        //ATON.setFogColor(osg.vec4.fromValues(0,0,0, 0.0));

                        break;

/*
                case "skf":
                    ATON.addGraph("https://media.sketchfab.com/urls/afce4db089014d27a201c72d1cc1bcba/dist/models/4827386b0e674b0a9a33f0281c987fea/file.osgjs.gz", { layer: "MAIN" })
                    break;
*/          
                default:
                    ATON.addGraph(ATON.FE.MODELS_ROOT+asset+"/root.osgjs", { layer: asset });
                    break;
                }
            });
        }

    // Sample MagNodes
/*
    if (asset === "magnet"){

        var M = new ATON.magNode();
        M.setRadius(2.0);
        M.setPositionAndTarget([0.658,-0.776,4.005]);
        //ATON.addMagNode(M);

        var M2 = new ATON.magNode();
        M2.setRadius(3.0);
        M2.setTarget([0.144,-0.462,4.723]);
        M2.setPosition([1.369,-1.544,4.254]);
        //M2.forces[0] = 0.01;
        ATON.addMagNode(M2);

        var M3 = new ATON.magNode();
        M3.setRadius(3.0);
        M3.setPosition([-2.5716285936594505,-2.0389141070658536,3.134113601993949]);
        M3.setTarget([-0.749320343566681,-0.4619313257452175,2.1931752975431884]);
        //M3.forces[0] = 0.01;
        ATON.addMagNode(M3);


        //ATON.addGraph("models/ground/ground.osgjs", { layer: "SCENE" });
        //ATON.addGraph("res/assets/hmd/hmd-z-nt.osgjs", { layer: "HMD" });
        ATON.addGraph("models/hebe/hebe.osgjs", { layer: "HEBE" });
        }
    
    if (asset === "complex"){
        ATON.addGraph("models/thermalcomplex/Capriata1.osgjs", { layer: "COMPLEX", transformRules: "models/thermalcomplex/Capriata1-inst.txt" });
        ATON.addGraph("models/thermalcomplex/ColonnaCorinzia.osgjs",{ layer: "COMPLEX", transformRules: "models/thermalcomplex/ColonnaCorinzia-inst.txt" });
        }

    if (asset === "karanis"){
        ATON.addGraph("models/karanis/karanis_architectures.osgjs", { layer: "KARANIS" });
        }

    if (asset === "gogh"){
        ATON.addGraph("models/glTF/scene.gltf", { layer: "TEST" });
        }
    
    //ATON.addGraph("models/medievalcity/citt_medievale_terrain_s6.osgjs", { layer: "MedCity" });
    //ATON.addGraph("models/medievalcity/citt_medievale.osgjs", { layer: "MedCity" });

    //ATON.addGraph("models/mywinger/mywinger.osgjs", { layer: "MY" });
    //ATON.addGraph("models/test/lamp_g1.osgjs");

if (asset === "faug"){
    ATON.addGraph("models/faug/exedrae.osgjs", { layer: "FAUG" });
    ATON.addGraph("models/faug/floor.osgjs", { layer: "FAUG" });
    ATON.addGraph("models/faug/rooves.osgjs", { layer: "FAUG" });
    ATON.addGraph("models/faug/temple_exterior.osgjs", { layer: "FAUG" });
    ATON.addGraph("models/faug/walls.osgjs", { layer: "FAUG" });
    }

    //ATON.addGraph("models/atoncube/cube.osgjs");
    //ATON.addGraph("models/sphere/sphere.osgjs");

    //ATON.addGraph("models/sphere/sphere.osgjs", {
    //    layer: "COMPLEX", 
    //    transformRules: "models/thermalcomplex/ColonnaCorinzia-inst.txt"
    //    });

if (asset === "domus"){
    ATON.addGraph("models/domus/LOD1_DP_Hor_1.osgjs", { layer: "DOMUS" });
    ATON.addGraph("models/domus/LOD1_DP_Hor_2.osgjs", { layer: "DOMUS" });
    ATON.addGraph("models/domus/LOD1_DP_Hor_3.osgjs", { layer: "DOMUS" });
    ATON.addGraph("models/domus/LOD1_DP_Hor_4.osgjs", { layer: "DOMUS" });
    ATON.addGraph("models/domus/LOD1_DP_Hor_5.osgjs", { layer: "DOMUS" });
    ATON.addGraph("models/domus/LOD1_DP_Hor_6.osgjs", { layer: "DOMUS" });
    ATON.addGraph("models/domus/LOD1_DP_Hor_7.osgjs", { layer: "DOMUS" });
    }

if (asset === "sf"){
    ATON.addGraph("models/SF/vhlab__SF-200916_L0_X0_Y0_subtile.osgjs", { layer: "terrain" } );
    }
*/

/*
    ATON.addDescriptor("proxies/T36.osgjs", "T36");
    ATON.addParentToDescriptor("T36", "PIPPO200");
    ATON.addParentToDescriptor("PIPPO200", "PLUTO");
*/

    //ATON.addGraph("models/gcanyon/vhlab__testwgl_L0_X0_Y0_subtile.osgjs");

    //ATON.switchLayer("HEBE", false);
    //ATON.switchLayer("COMPLEX", false);
    //ATON.switchLayer("KARANIS", false);


    //ATON.setVRcontrollerModel(ATON.FE.RES_ROOT+"assets/controllers/controller-ot-left.osgjs", ATON_VR_CONTROLLER_L);
    //ATON.setVRcontrollerModel(ATON.FE.RES_ROOT+"assets/controllers/controller-ot-right.osgjs", ATON_VR_CONTROLLER_R);

    // POVs
    var povstr = ATON.utils.getURLparams().pov;
    if (povstr){
        var values = povstr.split(',');

        ATON.setHome([values[0],values[1],values[2]], [values[3],values[4],values[5]]);
        }

    // Register onTick FrontEnd routine
    ATON.addOnTickRoutine(function(){
        //console.log("x");
        
        if (!ATON._vrState){
            if (ATON._hoveredVisData) $("#idHoverPos").html(
                ATON._hoveredVisData.p[0].toFixed(3)+", "+
                ATON._hoveredVisData.p[1].toFixed(3)+", "+
                ATON._hoveredVisData.p[2].toFixed(3)
                );
            else $("#idHoverPos").html("");
            }
    });

    // TEST Shape Descriptors
    var auDHover = new Audio(ATON.FE.AUDIO_ROOT+"blop.mp3");
    auDHover.loop = false;

    ATON.on("ShapeDescriptorHovered", function(d){
        $("#idShapeDescr").html(d.getUniqueID());
        auDHover.play();
        ATON.playTextToSpeech(d.getUniqueID());
        });
    ATON.on("ShapeDescriptorLeft", ()=>{
        $("#idShapeDescr").html("none");
        });

    // Tracer =====================
    ATON.tracer.resPath = ATON.FE.RES_ROOT;
    ATON.tracer.rootRecordFolder = "../services/record/";

    var recstr = ATON.utils.getURLparams().rec;
    if (recstr){
        var values = recstr.split(',');

        $("#idSession").show();

        if (ATON.utils.getURLparams().ovr && ATON.utils.getURLparams().ovr == 1){
            ATON.tracer.CSV_FORMAT = ATON.tracer.FORMAT_OVR;
            console.log("Tracer: reading OVR file records");
            }

        for (let u = 0; u < values.length; u++){
            var uid = parseInt( values[u] );

            ATON.tracer.loadUserRecord(scenename, uid);
            //console.log("---- USER "+uid+ "RECORD");
            }
        }

    // VRoadcast =====================
    ATON.vroadcast.setupResPath(ATON.FE.RES_ROOT);
    //ATON.vroadcast.setUserModel(ATON.vroadcast.resPath+"assets/hmd/hmd-z-nt.osgjs");
    ATON.vroadcast.setUserModel(ATON.vroadcast.resPath+"assets/user/head-zs.osgjs");

    $("#idVRoadcast").hide();
    $('#idUserColor').hide();

    //vrcIP = ATON.utils.getURLparams().vrc;
    if (vrcIP !== undefined){
        //IP = "127.0.0.1";
        //IP = "192.168.0.193";
        //IP = "192.167.233.180";
        //IP = "seth.itabc.cnr.it";

        if (vrcIP.length < 3) vrcIP = window.location.hostname;

        ATON.vroadcast.uStateFreq = 0.05;
        ATON.vroadcast.connect("http://"+vrcIP+":"+ATON.vroadcast.PORT+"/", scenename);

        $("#idVRoadcast").show();
        $('#idUserColor').show();

        // We have ID
        //ATON.vroadcast.onIDassigned = function(){
        ATON.on("VRC_IDassigned", (id)=>{
            var uid = ATON.vroadcast._myUser.id;
            var strColor = uColors[uid % 6];

            $('#idUserColor').show();
            $('#idUserColor').css("cssText", "background-color: rgba("+strColor+", 0.7); box-shadow: 0 0px 30px rgba("+strColor+",1.0);" );
            //$('#iContainer').css("cssText", "background-color: "+uColors[uid % 6]+" !important; opacity: 0.7;");
            $('#idUserColor').html("<b>U"+uid+"</b>");

            // disable controls for beta users
            if (uid > 0) $('#idMagSetup').hide();

            // Custom RANK
            var rankstr = ATON.utils.getURLparams().rank;
            if (rankstr){
                var r = parseInt(rankstr);
                ATON.vroadcast.setRank(r);
                //document.getElementById("urank").max = r;
                }

/*
            var magstr = ATON.utils.getURLparams().mag;
            if (magstr){
                var v = magstr.split(',');

                ATON.vroadcast.setWeight( parseFloat(v[0]) );
                if (v[1]) ATON.vroadcast.setMagRadius( parseFloat(v[1]) );
                }
*/

            $('#idVRCchat').append("<div><i>You (ID:"+uid+") entered scene "+scenename+"</i><br></div>");
            });

        // Disconnection
        //ATON.vroadcast.onDisconnect = function(){
        ATON.on("VRC_Disconnect", function(){
            ATON.vroadcast.users = [];

            //$('#iContainer').css("cssText", "background-color: black !important; opacity: 0.7;");
            $('#idUserColor').css("background-color", "black");
            $('#idUserColor').html("");
            $('#idUserColor').hide();

            $('#idVRCpanel').hide();
            });

        ATON.on("VRC_UserName", (d)=>{
            //$('#idVRCchat').append("<b>"+d.name+"</b>");
            });
        ATON.on("VRC_UserMessage", (d)=>{
            var uname;
            if (d.id === ATON.vroadcast._myUser.id) uname = "YOU";
            else uname = ATON.vroadcast.users[d.id].name;
            
            $('#idVRCchat').append("<div style='color: rgb("+uColors[d.id % 6]+")'><b>"+uname+":</b> "+d.status+"</div><br>");
            });
        
        ATON.on("VRC_UserLeft", (d)=>{
            var u = ATON.vroadcast.users[d.id];
            $('#idVRCchat').append("<div><i>User "+u.name+" left scene "+scenename+"</i><br></div>");
            });
        ATON.on("VRC_UserEntered", (d)=>{
            var u = ATON.vroadcast.users[d.id];
            $('#idVRCchat').append("<div><i>User "+u.name+" entered scene "+scenename+"</i><br></div>");
            });
        }

    // On completion
    ATON.on("AllNodeRequestsCompleted", function(){
        ATON.requestHome();

        $('#idLoader').hide();

        //$('#idLoader').hide();

        //ATON.setFOV(120);

        ATON.FE.buildLayerMenu();

        //if (QPV) QPV.loadQVAimg(QAurl+"?"+new Date().getTime());
        if (QPV) {
            ATON.vroadcast.requestPol();

            var qusvstr = ATON.utils.getURLparams().qv;
            if (qusvstr){
                var values = qusvstr.split(',');
                if (values.length === 2){
                    var layout = values[0];
                    var stateattrib = values[1];
        
                    if (layout === "qsa") ATON.FE.loadSencData(QPV, scenename, stateattrib, false);
                    if (layout === "sig") ATON.FE.loadSencData(QPV, scenename, stateattrib, true);
                    }
                }
            }
        });

    ATON.FE.attachListeners();
});