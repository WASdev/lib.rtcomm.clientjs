/**
 * After build done, move "portal" folder to NightlyBuild Root, 
 * move "idxResource" folder to NightlyBuild Root, and named as "idx" folder
 **/
var profile = (function(){
	
	var dojoVersion = "dojo_1.9.1";
	
	return {
	releaseName: dojoVersion,
	basePath: "../../../",
	releaseDir: "../../../idxPortal",
	cssOptimize: "comments",
	stripConsole: "warn",
	selectorEngine: "lite",
	action: "release",
	copyTests: true,
	trees:[
		["../portal/resources/images", "../portal/resources/images", /(\/\.)|(~$)/],
		["../portal/resources/css", "../portal/resources/css", /(\/\.)|(~$)/]
 	],
	packages: [{
        name: "dojo",
        location: "./dojo",
		destLocation: "./dojo"
    },{
        name: "dijit",
        location: "./dijit",
		destLocation: "./dijit"
    },{
        name: "dojox",
        location: "./dojox",
		destLocation: "./dojox"
    },{
        name: "gridx",
        location: "./gridx",
		destLocation: "./gridx"
    },{
        name: "idx",
        location: "../ibmjs/idx",
		destLocation: "../ibmjs/idx"
    },{
		name: "com",
		location: "../portal/js/com",
		destLocation: "../portal/js/com"
	}],
	staticHasFeatures: {
		"dojo-bidi" : 0,
		"dojo-firebug":0
	},
	layers: {
        "dojo/dojo": {
            include: [
				"dojo/dojo",
				"dojo/ready",
				"dojo/dom-construct",
				"dojo/i18n",
				"dojo/domReady",
				"dojo/hash",
				"dojo/selector/acme",
				"dojo/request",
				"dojo/request/default"
			],
			customBase: true,
			boot: true
        },
		"com/ibm/idxMain":{
			include: [
				"com/ibm/idxMain",
				"com/ibm/views/welcome/welcome"
			],
			exclude: [
				"dojo/dojo"
			]
		},
		"com/ibm/views/widgetref/widgetref": {
            include: [
				"com/ibm/views/widgetref/widgetref",
				"dojox/gfx/svg",
				"dojox/gfx/vml",
				"com/ibm/views/widgetref/widgetpg",
				"com/ibm/views/widgetref/allControllers"
			],
			exclude: [
				"dojo/dojo",
				"com/ibm/idxMain"
			]
        },
		"com/ibm/views/mobile/mobile": {
            include: [
				"com/ibm/views/mobile/mobile"
			],
			exclude: [
				"dojo/dojo",
				"com/ibm/idxMain"
			]
        },
		"com/ibm/views/templates/templates": {
            include: [
				"com/ibm/views/templates/templates",
				"idx/app/Header",
				"idx/widget/Menu",
				"idx/layout/MenuTabController",
				"dijit/MenuBarItem",
				"dijit/PopupMenuBarItem",
				"idx/widget/MenuBar",
				"idx/layout/FlipCardContainer"
			],
			exclude: [
				"dojo/dojo",
				"com/ibm/idxMain"
			]
        }
    }
};
})();
