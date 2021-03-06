const fs          = require('fs');
const path        = require('path');
const glob        = require("glob");
const jsonpatch   = require('fast-json-patch');
const del         = require('del');
const makeDir     = require('make-dir');

var passport = require('passport');
var Strategy = require('passport-local').Strategy;

const cookieParser   = require('cookie-parser');
const session        = require('express-session');
const FileStore      = require('session-file-store')(session);


ServUtils = {};

ServUtils.DIR_PUBLIC       = path.join(__dirname,"/../public/");
ServUtils.DIR_PRV          = path.join(__dirname, "_prv/");
ServUtils.DIR_NODE_MODULES = path.join(__dirname, "node_modules");
ServUtils.DIR_APIDOC       = path.join(__dirname, "/../API/");
ServUtils.DIR_FE           = path.join(ServUtils.DIR_PUBLIC,"hathor/");
ServUtils.DIR_BE           = path.join(ServUtils.DIR_PUBLIC,"shu/");
ServUtils.DIR_COLLECTION   = path.join(ServUtils.DIR_PUBLIC,"collection/");
ServUtils.DIR_MODELS       = path.join(ServUtils.DIR_COLLECTION,"models/");
ServUtils.DIR_PANO         = path.join(ServUtils.DIR_COLLECTION,"pano/");
ServUtils.DIR_SCENES       = path.join(ServUtils.DIR_PUBLIC,"scenes/");
ServUtils.DIR_EXAMPLES     = path.join(ServUtils.DIR_PUBLIC,"examples/");
ServUtils.STD_SCENEFILE    = "scene.json";
ServUtils.STD_PUBFILE      = "pub.txt";
ServUtils.STD_COVERFILE    = "cover.png";

ServUtils.STATUS_COMPLETE   = "complete";
ServUtils.STATUS_PROCESSING = "processing";


// Users
ServUtils.users = [];


// Routine for loading custom -> default fallback config JSON files
ServUtils.loadConfigFile = (jsonfile)=>{
	let customconfig  = path.join(ServUtils.DIR_PRV + jsonfile);
	let defaultconfig = path.join(__dirname, jsonfile);

	if (fs.existsSync(customconfig)){
		let C = JSON.parse(fs.readFileSync(customconfig, 'utf8'));
		console.log("Found custom config "+jsonfile);
		return C;
	}

	console.log(jsonfile+" not found in '_prv/', Loading default...");
	let C = JSON.parse(fs.readFileSync(defaultconfig, 'utf8'));
	return C;
};

// SSL certs
ServUtils.getCertPath = ()=>{
	return path.join(ServUtils.DIR_PRV,'server.crt');
};
ServUtils.getKeyPath = ()=>{
	return path.join(ServUtils.DIR_PRV,'server.key');
};

// Scene utils
ServUtils.getSceneFolder = (sid)=>{
	return path.join(ServUtils.DIR_SCENES,sid);
};
ServUtils.getSceneJSONPath = (sid)=>{
	let jsonfile = path.join( ServUtils.getSceneFolder(sid), ServUtils.STD_SCENEFILE);
	return jsonfile;
};
ServUtils.getPubFilePath = (sid)=>{
	let pubfile = path.join( ServUtils.getSceneFolder(sid), ServUtils.STD_PUBFILE);
	return pubfile;
};

// Check if scene exists on disk
ServUtils.existsScene = (sid)=>{;
	let b = fs.existsSync(ServUtils.getSceneJSONPath(sid));
	return b;
};

ServUtils.createBasicScene = ()=>{
	let sobj = {};

	sobj.status = ServUtils.STATUS_COMPLETE;

	sobj.scenegraph = {};
	sobj.scenegraph.nodes = {};
	sobj.scenegraph.nodes.main = {};
	sobj.scenegraph.edges = {};
	sobj.scenegraph.edges["."] = ["main"];

	sobj.scenegraph.nodes.main.urls = [];

	console.log(sobj);

	return sobj;
};

// Create sub-folder structure on disk
ServUtils.touchSceneFolder = (sid)=>{
	let D = ServUtils.getSceneFolder(sid);
	//if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true }); // note: NodeJS > 12.0
	if (!fs.existsSync(D)) makeDir.sync(D);
};

// Delete a scene folder
ServUtils.deleteScene = (sid)=>{
	let D = ServUtils.getSceneFolder(sid);
	console.log("Deleting "+D);
	//if (fs.existsSync(D)) fs.rmdirSync(D, { recursive: true }); // note: NodeJS > 12.0
	if (fs.existsSync(D)) del(D, {force: true});
};

ServUtils.readSceneJSON = (sid)=>{
	let jspath = ServUtils.getSceneJSONPath(sid);
	if (!fs.existsSync(jspath)) return undefined;

	let S = JSON.parse(fs.readFileSync(jspath, 'utf8'));
	return S;
};


// Apply partial edit to sobj
ServUtils.addSceneEdit = (sobj, edit)=>{
	//if (sobj === undefined) return undefined;

	// object or array
	if (typeof edit === "object"){
		for (let k in edit){
			let E = edit[k];

			//if (Array.isArray(E)){
			//	sobj[k] = E;
			//}

			// Touch
			if (sobj[k] === undefined){
				//sobj[k] = {};
				sobj[k] = Array.isArray(E)? [] : {};
			}

			sobj[k] = ServUtils.addSceneEdit(sobj[k], E);
		}

		return sobj;
	}

	// not object
	sobj = edit;
	return sobj;
};

ServUtils.deleteSceneEdit = (sobj, edit)=>{
	if (sobj === undefined) return undefined;

	// object or array
	if (typeof edit === "object"){
		for (let k in edit){
			let E = edit[k];

			//if (Array.isArray(sobj)) sobj = sobj.filter(e => e !== k);

			if (sobj[k] !== undefined){
				if (Object.keys(E).length > 0){
					sobj[k] = ServUtils.deleteSceneEdit(sobj[k], E);
				}
				else {
					//if (Array.isArray(sobj)) sobj = sobj.filter(e => e !== k);
					//else 
					delete sobj[k];
				}
			}
		}

		return sobj;
	}

	return undefined;
};

// Apply incoming patch to sid JSON
ServUtils.applySceneEdit = (sid, patch, mode)=>{
	let sjpath = ServUtils.getSceneJSONPath(sid);
	let S = ServUtils.readSceneJSON(sid);

	if (S === undefined) return; // scene does not exist

	//jsonpatch.applyPatch(S, patch);

	if (mode === "DEL") S = ServUtils.deleteSceneEdit(S, patch);
	else S = ServUtils.addSceneEdit(S, patch);

	S = ServUtils.cleanScene(S);

	fs.writeFileSync(sjpath, JSON.stringify(S)); // , null, 4

	//console.log(S);
	return S;
};

/*
ServUtils.applySceneEdit = (M, sobj)=>{
	let sid  = M.sid;
	let data = M.data;
	let task = M.task;

	if (sid === undefined) return false;
	if (task === undefined) return false;

	let sjpath = ServUtils.getSceneJSONPath(sid);
	let sobj = ServUtils.readSceneJSON(sid);

	if (sobj === undefined) return false; // scene does not exist

	//if (task === "DEL") sobj = ServUtils.deleteSceneEdit(sobj, patch);
	//if (task === "ADD") sobj = ServUtils.addSceneEdit(sobj, patch);

	if (task === "UPD_SEM_NODE"){
		let nid     = data.nid;
		let content = data.content;
		if (nid === undefined) return;
		if (sobj.semanticgraph[nid] === undefined) sobj.semanticgraph[nid] = {}; // touch

		sobj.semanticgraph[nid] = content;
	}

	// write
	sobj = ServUtils.cleanScene(sobj);
	fs.writeFileSync(sjpath, JSON.stringify(sobj)); // , null, 4

	//console.log(sobj);
	//return sobj;
	return true;
};
*/

ServUtils.cleanScene = (sobj)=>{
	// semantic graph
	if (sobj.semanticgraph && sobj.semanticgraph.edges){
		for (let e in sobj.semanticgraph.edges){
			let children = sobj.semanticgraph.edges[e];

			for (let c in children){
				let nid = children[c];
				//console.log(nid);

				if (sobj.semanticgraph.nodes === undefined || sobj.semanticgraph.nodes[nid] === undefined){
					children.splice(c, 1);
				}
			}
		}
	}

	// scene-graph
	if (sobj.scenegraph && sobj.scenegraph.edges){
		for (let e in sobj.scenegraph.edges){
			let children = sobj.scenegraph.edges[e];

			for (let c in children){
				let nid = children[c];
				//console.log(nid);

				if (sobj.scenegraph.nodes === undefined || sobj.scenegraph.nodes[nid] === undefined){
					children.splice(c, 1);
				}
			}
		}
	}

	return sobj;
};




// Write scene JSON from sid and data
ServUtils.writeSceneJSON = (sid, data, pub)=>{
	if (sid === undefined) return false;
	if (data === undefined) return false;

	ServUtils.touchSceneFolder(sid);

	let sjpath = ServUtils.getSceneJSONPath(sid);

	// Use partial update (first level)
/*
	if (bPartial){
		let S = ServUtils.readSceneJSON(sid);
		//for (let k in data) S[k] = data[k];
		Object.assign(S,data);

		fs.writeFileSync(sjpath, JSON.stringify(S, null, 4));
		return;
	}
*/	
	fs.writeFileSync(sjpath, JSON.stringify(data, null, 4));
	if (pub){
		let pubfile = ServUtils.getPubFilePath(sid);
		fs.writeFileSync(pubfile, "");
	}

	return true;
};

ServUtils.createClientUserAuthResponse = (req)=>{
	if (req.user === undefined) return {};

	let U = {};
	U.username = req.user.username;

	return U;
};

ServUtils.initUsers = (configfile)=>{
	ServUtils.users = ServUtils.loadConfigFile(configfile);
	console.log("DB users: "+ServUtils.users.length);
};

ServUtils.findByUsername = (username, cb)=>{
	process.nextTick(function() {
		for (let i = 0, len = ServUtils.users.length; i < len; i++){
			let U = ServUtils.users[i];

			if (U.username === username) return cb(null, U);
		}

	return cb(null, null);
	});
};

ServUtils.findById = (id, cb)=>{
	process.nextTick(()=>{
		if (ServUtils.users[id]) cb(null, ServUtils.users[id]);
		else cb( new Error('User ' + id + ' does not exist') );
	});
};

ServUtils.setupPassport = ()=>{

    passport.use( new Strategy((username, password, cb)=>{
        ServUtils.findByUsername(username, function(err, user) {
            if (err) return cb(err);
            if (!user) return cb(null, false);
            if (user.password != password) return cb(null, false);

            return cb(null, user);
        });
    }));

    passport.serializeUser((user, cb)=>{
        cb(null, ServUtils.users.indexOf(user));
    });

    passport.deserializeUser(function(id, cb) {
        ServUtils.findById(id, (err, user)=>{
            if (err) return cb(err);

            cb(null, user);
        });
    });

};

ServUtils.realizeAuth = (app)=>{
	let fileStoreOptions = {
		fileExtension: ".ses"
	};

	let bodyParser = require('body-parser');
	app.use(bodyParser.json({ limit: '50mb' }));
	app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

	//app.use(require('body-parser').urlencoded({ extended: true }));
	
	app.use(cookieParser());
	app.use(
		session({ 
			secret: 'shu',
			//cookie: { maxAge: 1800000 }, // 60000 = 1 min
			resave: true, 
			saveUninitialized: true,
			//rolling: true
			store: new FileStore(fileStoreOptions)	// required for consistency in cluster mode
		})
	);

	// Initialize Passport and restore authentication state, if any, from the session
    app.use(passport.initialize());
    app.use(passport.session());
};



// API
//================================================
ServUtils.realizeBaseAPI = (app)=>{

	// Get ID
	app.get("/api/getid/", function(req,res,next){
		let id = nanoid.nanoid();
		res.send(id);
	});

	// /api/scenes/<SID>
	app.get(/^\/api\/scene\/(.*)$/, function(req,res,next){
		let args = req.params[0].split(',');

		let bEdit = (args[1] && args[1] === "edit")? true : false; // Edit mode
		let sid = args[0];

		let sjsonpath = ServUtils.getSceneJSONPath(sid);

		if (fs.existsSync(sjsonpath)){
			//console.log(sjsonpath);
			return res.sendFile(sjsonpath);
		}

		// look into models collection and build scene
		let mfolder = path.join(ServUtils.DIR_COLLECTION,sid)+"/";
		let O = {};
		O.cwd = mfolder;

		glob("*.{gltf,glb}", O, (err, files)=>{ // "**/*.gltf"

			// build scene json
			let sobj = ServUtils.createBasicScene();

			if (sid.startsWith("models/")){
				for (let f in files) sobj.scenegraph.nodes.main.urls.push(sid+"/"+files[f]);
			}

			if (bEdit) ServUtils.writeSceneJSON(sid, sobj);

			console.log(sobj);

			return res.send(sobj);
		});

		//next();
	});

	// Back-end (SHU)
/*
	app.get("/be/newscene/", (req,res,next)=>{
		if (req.user === undefined){
			res.sendFile(path.join(ServUtils.DIR_BE, "auth/index.html"));
			return;
		}

		res.sendFile(path.join(ServUtils.DIR_BE,"newscene/index.html"));
	});
*/
	// List all published scenes
	app.get("/api/scenes/", function(req,res,next){
		let O = {};
		O.cwd = ServUtils.DIR_SCENES;
		O.follow = true;
		
		let files = glob.sync("**/"+ServUtils.STD_SCENEFILE, O);

		let S = [];
		for (let f in files){
			let basepath  = path.dirname(files[f]);
			let pubfile   = ServUtils.DIR_SCENES + basepath+"/" + ServUtils.STD_PUBFILE;
			let coverfile = ServUtils.DIR_SCENES + basepath+"/" + ServUtils.STD_COVERFILE;

			if (fs.existsSync(pubfile))
				S.push({
					sid: basepath,
					cover: fs.existsSync(coverfile)? true : false
				});
		}

		res.send(S);

		//next();
	});

	// List own scenes (authenticated user)
	app.get("/api/scenes/own/", function(req,res,next){
		if (req.user === undefined){
			res.send([]);
			return;
		}

		let uname = req.user.username;

		let O = {};
		O.cwd = ServUtils.DIR_SCENES+uname;
		O.follow = true;
		
		let files = glob.sync("**/"+ServUtils.STD_SCENEFILE, O);

		let S = [];
		for (let f in files){
			let basepath  = uname+"/"+path.dirname(files[f]);
			let pubfile   = ServUtils.DIR_SCENES + basepath+"/" + ServUtils.STD_PUBFILE;
			let coverfile = ServUtils.DIR_SCENES + basepath+"/" + ServUtils.STD_COVERFILE;

			S.push({
				sid: basepath,
				cover: fs.existsSync(coverfile)? true : false,
				pub: fs.existsSync(pubfile)? true : false
			});
		}

		res.send(S);

		//next();
	});

	// List all collection models
	app.get("/api/c/models/", function(req,res,next){

		if (req.user === undefined){
			res.send([]);
			return;
		}

		let uname   = req.user.username;
		let relpath = "models/"+uname+"/";

		let O = {};
		O.cwd = ServUtils.DIR_MODELS+uname;
		O.follow = true;

		let files = glob.sync("**/*.{gltf,glb}", O);

		let M = [];
		for (let f in files) M.push( relpath + files[f] );

		res.send(M);

		//next();
	});

	// List all collection panoramas
	app.get("/api/c/panoramas/", function(req,res,next){
		if (req.user === undefined){
			res.send([]);
			return;
		}

		let uname   = req.user.username;
		let relpath = "pano/"+uname+"/";

		let O = {};
		O.cwd = ServUtils.DIR_PANO+uname;
		O.follow = true;

		let files = glob.sync("**/*.{jpg,hdr}", O);

		let P = [];
		for (let f in files) P.push( relpath + files[f] );

		res.send(P);
		
		//glob("**/*.{jpg,hdr}", O, (err, files)=>{ });

		//next();
	});

	// List examples
	app.get("/api/examples/", function(req,res,next){
		let O = {};
		O.cwd = ServUtils.DIR_EXAMPLES;
		//O.follow = true;
		
		let files = glob.sync("**/*.html", O);

		let S = [];
		for (let f in files) S.push(files[f]);

		res.send(S);

		//next();
	});

	// Delete a scene
	app.post("/api/del/scene/", (req,res,next)=>{
		let O = req.body;
		let sid = O.sid;

		if (sid === undefined){
			res.send(false);
			return;	
		}

		// Only auth users can delete a scene
		if (req.user === undefined){
			console.log("Only auth users can delete a scene");
			res.send(false);
			return;
		}

		let uname = req.user.username;
		if (!sid.startsWith(uname)){ // only own scenes
			console.log("Only "+uname+" can delete this scene");
			res.send(false);
			return;
		}

		ServUtils.deleteScene(sid);
		res.send(true);
	});

	// Set scene cover
	app.post("/api/setcover/", (req,res,next)=>{
		let O = req.body;
		let sid = O.sid;
		let img = O.img;

		if (sid === undefined || img === undefined){
			res.send(false);
			return;
		}

		// Only auth users can delete a scene
		if (req.user === undefined){
			res.send(false);
			return;
		}

		img = img.replace(/^data:image\/png;base64,/, "");

		let coverfile = path.join(ServUtils.getSceneFolder(sid), "cover.png");
		console.log(coverfile);

		fs.writeFile(coverfile, img, 'base64', (err)=>{
			res.send(true);
		});
	});

	// Scene edit (add or remove)
	app.post('/api/edit/scene', (req, res) => {
		// TODO: only auth users

		let O = req.body;
		let sid   = O.sid;
		let mode  = O.mode;
		let patch = O.data;

		let J = ServUtils.applySceneEdit(sid, patch, mode);

		res.json(J);
	});

	// New Scene
	app.post('/api/new/scene', (req, res) => {
		// TODO: only auth users

		let O = req.body;
		let sid  = O.sid;
		let data = O.data;
		let pub  = O.pub;

		console.log(O);

		//ServUtils.touchSceneFolder(sid);
		let r = ServUtils.writeSceneJSON(sid, data, pub);

		res.json(r);
	});

	// Authenticate
	app.post('/api/login', passport.authenticate('local'/*, { failureRedirect: '/login' }*/), (req, res)=>{

		let U = ServUtils.createClientUserAuthResponse(req);

		res.send(U);
	});
	/*
	app.post("/api/login", (req,res,next)=>{
		passport.authenticate('local', function(err, user, info) {

			if (err){
				console.log(err);
				return next(err);
			}

			if (!user) {
				return res.status(401).json({
					err: info
				});
			}

			req.logIn(user, function(err){

				if (err) {
					console.log(err);
					return res.status(500).json({
						err: 'Could not log in user'
					});
				}

				res.status(200).json({
					status: 'Login successful!'
				});

			});
		})(req, res, next);
	});
	*/

	app.get('/api/logout', (req, res)=>{
		console.log(req.user);

		req.logout();
		res.send(true);
	});

	app.get("/api/user", (req,res)=>{
		console.log(req.session);

		let U = ServUtils.createClientUserAuthResponse(req);
		res.send(U);
	});

	// List all users in DB (only admin)
	app.get("/api/users", (req,res)=>{

		if (req.user === undefined || !req.user.admin){
			res.send([]);
			return;
		}

		let uu = [];
		for (let u in ServUtils.users) uu.push(ServUtils.users[u].username);

		res.send(uu);
	});

	app.post('/api/new/user', (req, res) => {
		if (req.user === undefined || !req.user.admin){
			res.send(false);
			return;
		}

		let O = req.body;

		console.log(O);

		// TODO: add new entry into users json

		res.send(true);
	});

};


// Not used
/*
ServUtils.userLogin = (id)=>{
	let sessionfile = ServUtils.DIR_PRV + "s-"+id+".json";
	if (!fs.existsSync(sessionfile)) fs.writeFileSync(sessionfile, "");
};

ServUtils.userLogout = (id)=>{
	let sessionfile = ServUtils.DIR_PRV + "s-"+id+".json";
	if (!fs.existsSync(sessionfile)) fs.unlinkSync(sessionfile);
};
*/

module.exports = ServUtils;