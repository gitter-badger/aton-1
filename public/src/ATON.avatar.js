/*
    ATON Avatar Class
    used in VRoadcast system

    author: bruno.fanini_AT_gmail.com

===========================================================*/

import Node from "./ATON.node.js";

export default class Avatar extends Node {

constructor(uid){
    super(undefined /*uid*/, ATON.NTYPES.UI);

    this.userid   = uid;
    this.username = undefined; //"User #"+uid;
    this.message  = "...";
    
    //this.bTalking = false;
    this._auTalk = undefined;
    this._bPlayingAudio = false;
    this._auChunks = [];

    this._tStateCall = -1.0;
    //this._tStateDur  = 0.1;
    this._tProgress  = 0.0;

    // Focal point
    this._tFocCall = -1.0;
    this._currFocusPos = new THREE.Vector3();
    this._tgtFocusPos  = undefined;

    this._currState  = {};
    this._currState.position   = new THREE.Vector3();
    this._currState.quaternion = new THREE.Quaternion();

    this._tgtState = undefined;

    //console.log(this);

    this.realize();
}

getAvatarMaterialByUID(uid){
    //if (uid === undefined) return 0;

    let avaMats = ATON.MatHub.materials.avatars;
    let mi = (uid % avaMats.length); //uid? (uid % avaMats.length) : 0;
    
    return avaMats[mi];
}

realize(){
    // build minimal representation
    let g = new THREE.SphereGeometry( 0.2, 16, 16 );

    this.usermaterial = this.getAvatarMaterialByUID(this.userid);

    let smesh = new THREE.Mesh( g, this.usermaterial );

    this.usermeshnode = ATON.createUINode();
    this.usermeshnode.add(smesh);
    this.usermeshnode.setMaterial(this.usermaterial);

    // CHECK / FIXME: this is to avoid cloning of the same mesh when using same representation for all avatars
    this.usermeshnode.setCloneOnLoadHit(false);

    // Talk UI
    this.userauinode = new THREE.Sprite( ATON.VRoadcast.uspritemats[this.userid % ATON.VRoadcast.uspritemats.length] );
    this.userauinode.position.set(0,0,0);
    this.userauinode.visible = false;

    // Focus
    this.userfpnode = new THREE.Sprite( ATON.VRoadcast.ufocmats[this.userid % ATON.VRoadcast.ufocmats.length] );
    this.userfpnode.position.set(0,0,0);
    //this.userfpnode.scale.set(10,10,10);
    this.userfpnode.visible = false;

    // Build Label
    this.userlabelnode = ATON.createUINode();
    this.labelcontainer = new ThreeMeshUI.Block({
        width: 0.7,
        height: 0.25,
        padding: 0.03,
        borderRadius: 0.05,
        //backgroundColor: ATON.VRoadcast.ucolorsdark[this.userid % ATON.VRoadcast.ucolorsdark.length],
        backgroundColor: ATON.MatHub.colors.black,

        fontFamily: ATON.PATH_RES+"fonts/custom-msdf.json", //ATON.PATH_MODS+'three-mesh-ui/examples/assets/Roboto-msdf.json',
        fontTexture: ATON.PATH_RES+"fonts/custom.png" //ATON.PATH_MODS+'three-mesh-ui/examples/assets/Roboto-msdf.png',

        //alignContent: 'right', // could be 'center' or 'left'
        //justifyContent: 'end', // could be 'center' or 'start'
    });

    this.userlabelnode.position.y = 0.4;
    this.userlabelnode.add(this.labelcontainer);

    // username text
    this.usernametext = new ThreeMeshUI.Text({ 
        content: "User #"+this.userid,
        fontSize: 0.09,
        //fontColor: ATON.MatHub.colors.white
        fontColor: ATON.VRoadcast.ucolors[this.userid % ATON.VRoadcast.ucolors.length]
    });
    this.usernametext.position.y = 0.0;

    // message text
    this.usermessagetext = new ThreeMeshUI.Text({ 
        content: "\nHello World!",
        fontSize: 0.03,
        fontColor: ATON.MatHub.colors.white
    });
    this.usermessagetext.position.y = -0.03;

    this.labelcontainer.add(this.usernametext);
    this.labelcontainer.add(this.usermessagetext);
    
    this.add(this.usermeshnode);
    this.add(this.userlabelnode);
    this.add(this.userauinode);

    //this.add(this.userfpnode);
    
    // Focus is centralized for better location accuracy
    if (ATON.VRoadcast._focNodes[this.userid] === undefined){
        ATON.VRoadcast._focNodes[this.userid] = this.userfpnode;
        ATON.VRoadcast.focGroup.add( this.userfpnode );
    }
};

// Loads custom avatar representation (3D model)
loadRepresentation(url){
    let A = this;

    if (A.usermeshnode.children[0] !== undefined){
        A.usermeshnode.remove(A.usermeshnode.children[0]);
    }

    A.usermeshnode.load(url); //.setMaterial(A.usermaterial);

    return this;
}

setUsername(username){
    this.username = username;

    this.usernametext.set({ 
        content: username
    });

    return this;
}

getUsername(){
    if (this.userid === undefined) return undefined;
    if (this.username === undefined) return "User #"+this.userid;
    return this.username;
}

setMessage(msg){
    this.message = msg;

    // TODO: check for text length
    this.usermessagetext.set({ 
        content: "\n"+msg
    });

    return this;
}

setTalkVolume(vol){
    if (vol === undefined){
        this.userauinode.visible = false;
        return;
    }
    if (vol > 0){
        this.userauinode.visible = true;
        let v = 0.1 + (vol * 0.03);
        this.userauinode.scale.set(v,v,v);
    }
    else this.userauinode.visible = false;
}

hideFocalPoint(){
    this.userfpnode.visible = false;
}

requestFocus(fp){
    if (this._tFocCall >= 0.0) return; // already requested

    this._tFocCall = ATON._clock.elapsedTime;

    this._currFocusPos.copy(this.userfpnode.position);

    this._tgtFocusPos = new THREE.Vector3( parseFloat(fp[0]), parseFloat(fp[1]), parseFloat(fp[2]));
    this._tgtFocusRad = parseFloat(fp[3])*2.0;

    this.userfpnode.scale.set(this._tgtFocusRad,this._tgtFocusRad,this._tgtFocusRad);

    this.userfpnode.visible = true;
}

handleFocusTransition(){
    if (this._tFocCall < 0.0) return;

    let D = ATON.VRoadcast.USER_STATE_FREQ; //this._tStateDur;

    let t = (ATON._clock.elapsedTime - this._tFocCall) / D;

    // End
    if (t >= 1.0){
        this._tFocCall = -1.0;

        this.userfpnode.position.copy(this._tgtFocusPos);
        this.userfpnode.scale.set(this._tgtFocusRad,this._tgtFocusRad,this._tgtFocusRad);
        
        this.userfpnode.visible = true;

        //console.log(this.userfpnode.position);

        return;
    }

    this.userfpnode.position.lerpVectors(this._currFocusPos, this._tgtFocusPos, t);

    //let s = this._tgtFocusRad;
    //this.userfpnode.scale.set(s,s,s);
    this.userfpnode.visible = true;

    //console.log(this.userfpnode.position);
}

requestStateTransition(S){
    if (this._tStateCall >= 0.0) return; // already requested

    this._tStateCall = ATON._clock.elapsedTime;

    this._currState.position.copy(this.position);
    this._currState.quaternion.copy(this.quaternion);

    this._tgtState = S;
    
    //this._sDistance = this.position.distanceTo(S.position);
}

handleStateTransition(){
    if (this._tStateCall < 0.0) return;

    let D = ATON.VRoadcast.USER_STATE_FREQ; //this._tStateDur;

    if (D <= 0.0) this._tProgress = 1.0;
    else this._tProgress = (ATON._clock.elapsedTime - this._tStateCall) / D;

    let cs = this._currState;
    let ts = this._tgtState;

    // End
    if (this._tProgress >= 1.0){
        this._tStateCall = -1.0;

        this.position.copy(ts.position);
        //this.quaternion.copy(ts.quaternion);
        this.usermeshnode.quaternion.copy(ts.quaternion);

        return;
    }

    this.position.lerpVectors(cs.position, ts.position, this._tProgress);
    this.usermeshnode.quaternion.slerp(ts.quaternion, this._tProgress);
    //THREE.Quaternion.slerp( cs.quaternion, ts.quaternion, this.usermeshnode.quaternion, this._tProgress);
}

update(){
    this.handleStateTransition();
    if (this.userfpnode.visible){
        this.handleFocusTransition();

        let s = this.userfpnode.scale.x;
        if (s>0.001) this.userfpnode.scale.set(s*0.99,s*0.99,s*0.99);
        else this.userfpnode.visible = false;
    }

    let cam  = ATON.Nav._camera;
    let eye = ATON.Nav._currPOV.pos;
    if (cam === undefined || eye === undefined) return;

    //this.userlabelnode.lookAt( eye );

    //this.userlabelnode.setRotationFromMatrix(cam.matrix); // quaternion.setFromRotationMatrix( cam.matrix );
    //this.userlabelnode.rotation.copy(cam.rotation);

    this.userlabelnode.orientToCamera(); //quaternion.copy( ATON.Nav._qOri );

    // Talk UI
    //this._handleTalk();

    let avol = this.userauinode.scale.x;
    avol *= 0.99; // shrinking rate

    if (avol > 0.01) this.userauinode.scale.set(avol, avol, avol);
    else this.userauinode.visible = false;

/*
    this.userlabelnode.rotation.y = Math.atan2(
        ( cam.position.x - this.userlabelnode.position.x ),
        ( cam.position.z - this.userlabelnode.position.z )
    );
*/
    //this.userlabelnode.matrix.copy( cam.matrix );
}

_handleTalk(){
    if (this._bPlayingAudio) return;
    if (this._auChunks.length < 1) return;

    let d = this._auChunks.shift();

    let au = new Audio();
    au.src = d.data;

    au.play();
    this._bPlayingAudio = true;

    au.onended = ()=>{
        this._bPlayingAudio = false;
        //console.log("finished playing chunk");
    };

    //this.setTalkVolume(d.volume);
    this.setTalkVolume(5.0);
}


};