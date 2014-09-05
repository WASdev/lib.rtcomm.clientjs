//build.bat profile=idxdojocompress.profile.js 
function timestamp(){
    // this function isn't really necessary...
    // just using it to show you can call a function to get a profile property value
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + "-" + d.getDate() + "-" +
    d.getHours() +
    ':' +
    d.getMinutes() +
    ":" +
    d.getSeconds();
}


var profile = {
    releaseDir: "../../../../../../idxdojocompress",
    action: 'release',
    buildTimestamp: timestamp(),
    cssOptimize: "comments",
    optimize: "shrinksafe",
    stripConsole: "all",
    layerOptimize: "shrinksafe",
    selectorEngine: 'acme',
    packages: [{
        name: 'dojo',
        location: '../../../dojo',
        resourceTags: {}
    }, {
        name: 'dijit',
        location: '../../../dijit',
        resourceTags: {}
    }, {
        name: 'dojox',
        location: '../../../dojox',
        resourceTags: {}
    }, {
        name: 'gridx',
        location: '../../../gridx',
        resourceTags: {}
    }, {
        name: 'idx',
        location: '../../../../ibmjs/idx',
        resourceTags: {}
    }],
    layers: {
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
};
