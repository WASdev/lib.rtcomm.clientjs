//build.bat profile=oneuidemos.profile.js -r 

function timestamp(){
    // this function isn't really necessary...
    // just using it to show you can call a function to get a profile property value
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth()+1) + "-" + d.getDate() + "-" +
        d.getHours() + ':' + d.getMinutes() + ":" + d.getSeconds();
}

var profile = {
	releaseDir: "../../../../../../allInOne",
	buildTimestamp: timestamp(),
	cssOptimize: "comments",
	//optimize: "shrinksafe",
	//layerOptimize: "shrinksafe",
	optimize: "closure",
	layerOptimize: "closure",
	stripConsole: "all",
	selectorEngine: 'lite',
	mini: false,
	defaultConfig: {
		hasCache: {
			"dojo-built": 1,
			"dojo-loader": 1,
			"dom": 1,
			"host-browser": 1,
			"dojo-bidi": 1,
			"config-selectorEngine": "lite"
		},
		async: 1
	},
    staticHasFeatures: {
        "config-deferredInstrumentation": 0,
        "config-dojo-loader-catches": 0,
        "config-tlmSiblingOfDojo": 0,
        "dojo-amd-factory-scan": 0,
        "dojo-combo-api": 0,
        "dojo-config-api": 1,
        "dojo-config-require": 0,
        "dojo-debug-messages": 0,
        "dojo-dom-ready-api": 1,
        "dojo-firebug": 0,
        "dojo-guarantee-console": 1,
        "dojo-has-api": 1,
        "dojo-inject-api": 1,
        "dojo-loader": 1,
        "dojo-log-api": 0,
        "dojo-modulePaths": 0,
        "dojo-moduleUrl": 0,
        "dojo-publish-privates": 0,
        "dojo-requirejs-api": 0,
        "dojo-sniff": 1,
        "dojo-sync-loader": 0,
        "dojo-test-sniff": 0,
        "dojo-timeout-api": 0,
        "dojo-trace-api": 0,
        "dojo-undef-api": 0,
        "dojo-v1x-i18n-Api": 1,
        "dom": 1,
        "host-browser": 1,
        "extend-dojo": 1
    },
	packages: [
		{
			name: 'dojo',
			location: '../../../dojo',
			resourceTags: {
				ignore: function(filename, mid){
					return (/tests/.test(filename) || /demos/.test(filename) );
				}
			}			
		},
		{
			name: 'dijit',
			location: '../../../dijit',
			resourceTags: {
				ignore: function(filename, mid){
					return (/tests/.test(filename) || /demos/.test(filename) );
				}
			}
		},
		{
			name: 'dojox',
			location: '../../../dojox',
			resourceTags: {
				ignore: function(filename, mid){
					return (/tests/.test(filename) || /demos/.test(filename)  );
				}
			}
		},
		{
			name: 'gridx',
			location: '../../../gridx',
			resourceTags: {
				ignore: function(filename, mid){
					return (/tests/.test(filename) || /demos/.test(filename)  );
				}
			}
		},
		{
			name: 'idx',
			location: '../../../../ibmjs/idx', 
			resourceTags: {
				
			}
		}
	],
	layers: {
		'dojo/dojo':{
			include: [
				'dojo/dojo',
				'dojo/ready',
				'dojo/dom-construct',
				'dojo/i18n',
				'dojo/domReady',
				'dojo/hash',
				'dojo/selector/acme',
				'dojo/request',
				'dojo/request/default'
			],
			customBase: true,
			boot: true
		},
		'dojox/dojox' :{
			include: [
				'dojox/dtl/_base',
				'dojox/dtl/Context',
				'dojox/dtl/tag/logic',
				'dojox/string/tokenize',
				'dojox/string/Builder',
				'dojox/highlight/languages/xml',
				'dojox/highlight/languages/pygments/xml',
				'dojox/highlight/languages/html',
				'dojox/highlight/languages/pygments/html',
				'dojox/highlight/_base',
				'dojox/highlight/languages/javascript',
				'dojox/highlight/languages/pygments/javascript',
				'dojox/highlight/_base',
				'dojox/highlight/widget/Code',
				'dojox/highlight/languages/pygments/_html',
				'dojox/fx/flip',
				'dojox/widget/FisheyeList',
				'dojox/widget/FisheyeListItem',
				'dojox/widget/AutoRotator',
				'dojox/widget/rotator/Controller',
				'dojox/widget/rotator/Fade',
				'dojox/widget/rotator/Pan',
				'dojox/fx/scroll',
				'dojox/layout/TableContainer',
				'dojox/fx/_base',
				'dojox/widget/Rotator',
				'dojox/fx/_core',
				'dojo/fx/easing',
				'dojox/image/MagnifierLite',
				'dojox/image/Magnifier',
				'dojox/gfx',
				'dojox/gfx/canvas',
				'dojox/gfx/_base',
				'dojox/gfx/renderer',
				'dojox/gfx/shape',
				'dojox/gfx/path',
				'dojox/gfx/arc',
				'dojox/gfx/svg',
				'dojox/gfx/decompos',
				'dojox/gfx/matrix'
			]
		},
		'idx/idx': {
			include: [
				'idx/app/AppFrame',
				'idx/app/AppMarquee',
				'idx/app/Header',
				'idx/app/HighLevelTemplate',
				'idx/app/LoginFrame',
				'idx/app/TabMenuLauncher',
	
				'dijit/layout/AccordionContainer',
				'idx/layout/BorderContainer',
				'idx/layout/BreadcrumbController',
				'idx/layout/HeaderPane',
				'idx/layout/TitlePane',
				'idx/layout/DockTabContainer',
				'idx/layout/MenuTabController',
				'idx/layout/MoveableTabContainer',
				'idx/layout/OpenMenuTabContainer',
				'idx/layout/ListNavController',
				'idx/layout/PartialListNavController',
				'idx/layout/SectionedNavController',
	
				'dijit/form/Button',
				'dijit/form/DropDownButton',
				'dijit/form/ComboButton',
				'dijit/form/ToggleButton',
				'idx/form/CheckBox',
				'idx/form/CheckBoxList',
				'idx/form/CheckBoxSelect',
				'idx/form/TriStateCheckBox',
				'idx/form/RadioButtonSet',
				'idx/form/Select',
				'idx/form/ComboBox',
				'idx/form/FilteringSelect',
				'idx/form/Link',
				'idx/form/ComboLink',
				'idx/form/DropDownLink',
				'idx/form/DropDownSelect',
				'dijit/form/SimpleTextarea',
				'idx/form/TextBox',
				'idx/form/Textarea',
				'idx/form/DropDownSelect',
				'dijit/form/SimpleTextarea',
				'idx/form/NumberSpinner',
				'idx/form/NumberTextBox',
				'idx/form/CurrencyTextBox',
				'idx/form/DateTextBox',
				'idx/form/TimeTextBox',	
				'idx/form/DateTimeTextBox',
				'idx/form/HorizontalSlider',
				'idx/form/VerticalSlider',
	
				'idx/widget/Banner',
				'idx/widget/Breadcrumb',
				'dijit/Calendar',
				'dijit/ColorPalette',
				'dijit/Editor',
				'idx/widget/CheckBoxTree',
				'idx/widget/EditController',
				'dijit/InlineEditBox',
				'dijit/ProgressBar',
				'dijit/Toolbar',
				'dijit/Tree',
				'idx/widget/Menu',
				'idx/widget/MenuBar',
				'idx/widget/ModalDialog',
				'idx/widget/NavTree',
				'idx/widget/ResizeHandle',
				'idx/widget/TypeAhead',
	
				'idx/widget/PersonCard',
				'idx/widget/HoverCard',
				'idx/widget/HoverHelp',
				'idx/widget/HoverHelpTooltip',
	
				'idx/widget/Dialog',
				'idx/widget/ModalDialog',
				'idx/widget/ConfirmationDialog',
				'idx/widget/SingleMessage',
				'idx/widget/Toaster',
	
				
				'gridx/Grid',
				'gridx/core/model/cache/Async',
				'idx/gridx/tests/support/data/ComputerData',
				'idx/gridx/tests/support/stores/Memory',
				'idx/gridx/tests/support/modules',
	
				'dojo/date/locale',
				'dojo/data/ItemFileReadStore',
				'dojo/data/ItemFileWriteStore',
				'dojo/dnd/Source',
				'dijit/layout/TabContainer',
				'dijit/layout/LinkPane',
				'dijit/layout/ContentPane',
				'dijit/PopupMenuBarItem',
				'dijit/MenuBarItem',
				'dijit/MenuItem',
				'dijit/form/MultiSelect',
				'dijit/_editor/plugins/TextColor', 
				'dijit/layout/AccordionContainer',
				'idx/dialogs'
			]
		}
	}//end layers
    //end transformJobs
};
