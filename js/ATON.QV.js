/*!
    @preserve

    ATON QuantizedVolumes Module
    depends on ATON.core

 	@author Bruno Fanini
	VHLab, CNR ITABC

==================================================================================*/

ATON.QVhandler = {};

const ATON_SM_UNIT_QV = 6;

const QV_SLICE_RES = 32; //64; //256; //128;
const QV_Z_SLICES  = 32; //64; //16; //32;
const QV_SIZE      = QV_SLICE_RES*QV_Z_SLICES;

/*
    Quantized Volume object
=================================*/
ATON.QVhandler.QV = function(){
    this.vMin = [0.0,0.0,0.0];
    this.vExt = [10.0,10.0,10.0];

    this.qvaIMGurl    = undefined;
    this.qvaIMGfilter = osg.Texture.NEAREST;

    this._qvaTex = new osg.Texture();
    this._qvaTex.setWrapS( osg.Texture.CLAMP_TO_EDGE ); // CLAMP_TO_EDGE / REPEAT
    this._qvaTex.setWrapT( osg.Texture.CLAMP_TO_EDGE );

    this._qvaIMG = new Image();
};

ATON.QVhandler.QV.prototype = {
    setPositionAndExtents: function(pos,ext){
        this.vMin = pos.slice(0);
        this.vExt = ext.slice(0);
        },

    // (re)loads associated qva img (signature, etc...)
    loadQVAimg: function(url){
        this._qvaIMGloaded = false;
        if (url !== undefined) this.qvaIMGurl = url;

        if (this.qvaIMGurl === undefined) return;

        var qTex = this._qvaTex;
        qTex.setMinFilter( this.qvaIMGfilter );
        qTex.setMagFilter( this.qvaIMGfilter );

        osgDB.readImageURL( this.qvaIMGurl ).then( function ( data ){     
            qTex.setImage( data );

            //qTex.setMinFilter( 'LINEAR' );
            //qTex.setMagFilter( 'LINEAR' );

            ATON._mainSS.setTextureAttributeAndModes( ATON_SM_UNIT_QV, qTex );
            this._qvaIMGloaded = true;
            console.log("QVA image "+url+" loaded.");
            });

        // For ReadPixels
        this._qvaIMG.src = this.qvaIMGurl;
        this._qvaCanvas  = document.createElement('canvas');
        this._qvaCanvas.width  = QV_SIZE;
        this._qvaCanvas.height = QV_SLICE_RES;
        this._qvaContext = this._qvaCanvas.getContext('2d');

        var that = this;
        this._qvaIMG.onload = function(){
            that._qvaContext.drawImage(that._qvaIMG, 0,0, that._qvaCanvas.width,that._qvaCanvas.height);
            }
        },

    getNormLocationInVolume: function(loc){
        var px = (loc[0] - this.vMin[0]) / this.vExt[0];
        var py = (loc[1] - this.vMin[1]) / this.vExt[1];
        var pz = (loc[2] - this.vMin[2]) / this.vExt[2];

        return [px,py,pz];
        },

    getResolution: function(){
        var rx = this.vExt[0] / 256.0;
        var ry = this.vExt[1] / 256.0;
        var rz = this.vExt[2] / 256.0;

        return [rx,ry,rz];
        },

    getPixel: function(x, y){
        return this._qvaContext.getImageData(x, y, 1, 1).data;
        },
    
    getValue: function(loc){
        var P = this.getNormLocationInVolume(loc);

        // Check outside volume
        if (P[0] > 1.0 || P[0] < 0.0) return undefined;
        if (P[1] > 1.0 || P[1] < 0.0) return undefined;
        if (P[2] > 1.0 || P[2] < 0.0) return undefined;

        //console.log(P);

        //P[0] -= (1.0/QV_SLICE_RES);
        P[1] -= (1.0/QV_SLICE_RES);
        //P[2] -= (1.0/QV_SLICE_RES);

        var i,j,t;
        i = parseInt(P[0] * QV_SLICE_RES);
        j = parseInt(P[1] * QV_SLICE_RES);

        t = parseInt(P[2] * QV_Z_SLICES); // tile index

        i += (t * QV_SLICE_RES); // offset

        return this.getPixel(i,j);
        },

    getWorldLocationFromRGB: function( r, g, b ){
        var x = (r / 255.0) * this.vExt[0];
        var y = (g / 255.0) * this.vExt[1];
        var z = (b / 255.0) * this.vExt[2];

        x += this.vMin[0];
        y += this.vMin[1];
        z += this.vMin[2];

        return [x,y,z];
        },
};


ATON.QVhandler.QVList     = [];
ATON.QVhandler._activeQVi = -1;


ATON.QVhandler.addQV = function(pos, ext){
    var QV = new ATON.QVhandler.QV();
    QV.setPositionAndExtents(pos, ext);

    ATON.QVhandler.QVList.push(QV);

    if (ATON.QVhandler.QVList.length === 1) ATON.QVhandler.setActiveQVbyIndex(0);

    return QV;
};

ATON.QVhandler.setActiveQVbyIndex = function(index){
    var qv = ATON.QVhandler.QVList[index];
    if (qv === undefined) return;

    ATON.QVhandler._activeQVi = index;

    ATON._mainSS.getUniform('uQVmin').setFloat3( qv.vMin );
    ATON._mainSS.getUniform('uQVext').setFloat3( qv.vExt );

    qv.loadQVAimg();

    console.log("QV #"+index+" now ACTIVE");
};

ATON.QVhandler.getActiveQV = function(){
    if (ATON.QVhandler._activeQVi < 0) return undefined;

    return ATON.QVhandler.QVList[ATON.QVhandler._activeQVi];
};









/* ---- OLD
ATON.QVhandler.setPositionAndExtents = function(vMin, vExt) {
    ATON.QVhandler.vMin = vMin.slice(0);
    ATON.QVhandler.vExt = vExt.slice(0);

    ATON._mainSS.getUniform('uQVmin').setFloat3( ATON.QVhandler.vMin );
    ATON._mainSS.getUniform('uQVext').setFloat3( ATON.QVhandler.vExt );
};

ATON.QVhandler.loadILSign = function(path){
    var ILSTexture = new osg.Texture();
    osgDB.readImageURL( path ).then( function ( data ){      
        ILSTexture.setImage( data );

        ILSTexture.setMinFilter( osg.Texture.NEAREST ); // important!
        ILSTexture.setMagFilter( osg.Texture.NEAREST );

        ILSTexture.setWrapS( osg.Texture.CLAMP_TO_EDGE ); // CLAMP_TO_EDGE / REPEAT
        ILSTexture.setWrapT( osg.Texture.CLAMP_TO_EDGE );

        ATON._mainSS.setTextureAttributeAndModes( ATON_SM_UNIT_QV, ILSTexture );
        console.log("ILSignature "+path+" loaded.");
        });
};

ATON.QVhandler.loadQVASign = function(path){
    var QVATexture = new osg.Texture();
    osgDB.readImageURL( path ).then( function ( data ){      
        QVATexture.setImage( data );

        //QVATexture.setMinFilter( 'LINEAR' );
        //QVATexture.setMagFilter( 'LINEAR' );
        QVATexture.setMinFilter( osg.Texture.NEAREST );
        QVATexture.setMagFilter( osg.Texture.NEAREST );

        QVATexture.setWrapS( osg.Texture.CLAMP_TO_EDGE ); // CLAMP_TO_EDGE / REPEAT
        QVATexture.setWrapT( osg.Texture.CLAMP_TO_EDGE );

        ATON._mainSS.setTextureAttributeAndModes( ATON_SM_UNIT_QV, QVATexture );
        console.log("QVA Signature "+path+" loaded.");
        });
};
*/