function timestamp() {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + "-" + d.getDate() + "-"
      + d.getHours() + ':' + d.getMinutes() + ":" + d.getSeconds();
}

var profile = {
  action : 'release',
  basePath : "../../../",
  releaseDir : "../build/build-release",
  buildTimestamp : timestamp(),
  cssOptimize : "comments",
  stripConsole : "all",
  layerOptimize : "closure",
  selectorEngine : 'lite',
  mini : true,

  defaultConfig : {
    hasCache : {
      "dojo-built" : 1,
      "dojo-loader" : 1,
      "dom" : 1,
      "host-browser" : 1,
      "config-selectorEngine" : "lite"
    },
    async : 1
  },

  packages : [ {
    name : 'dojo',
    location : 'dojo',
    resourceTags : {
      ignore : function(filename, mid) {
        return (/tests/.test(filename) || /demos/.test(filename));
      }
    }
  }, {
    name : 'dijit',
    location : 'dijit',
    resourceTags : {
      ignore : function(filename, mid) {
        return (/tests/.test(filename) || /demos/.test(filename));
      }
    }
  }, {
    name : 'dojox',
    location : 'dojox',
    resourceTags : {
      ignore : function(filename, mid) {
        return (/tests/.test(filename) || /demos/.test(filename));
      }
    }
  }, {
    name : 'gridx',
    location : 'gridx',
    resourceTags : {
      ignore : function(filename, mid) {
        return (/tests/.test(filename) || /demos/.test(filename));
      }
    }
  }, {
    name : 'idx',
    location : '../ibmjs/idx',
    resourceTags : {}
  }, {
    name : 'catalog',
    location : '../../../../com.ibm.ws.ui/resources/WEB-CONTENT',
    resourceTags : {}
  } ],
  staticHasFeatures : {
    "config-deferredInstrumentation" : 0,
    "config-dojo-loader-catches" : 0,
    "config-tlmSiblingOfDojo" : 0,
    "dojo-amd-factory-scan" : 0,
    "dojo-combo-api" : 0,
    "dojo-config-api" : 1,
    "dojo-config-require" : 0,
    "dojo-debug-messages" : 0,
    "dojo-dom-ready-api" : 1,
    "dojo-firebug" : 0,
    "dojo-guarantee-console" : 1,
    "dojo-has-api" : 1,
    "dojo-inject-api" : 1,
    "dojo-loader" : 1,
    "dojo-log-api" : 0,
    "dojo-modulePaths" : 0,
    "dojo-moduleUrl" : 0,
    "dojo-publish-privates" : 0,
    "dojo-requirejs-api" : 0,
    "dojo-sniff" : 1,
    "dojo-sync-loader" : 0,
    "dojo-test-sniff" : 0,
    "dojo-timeout-api" : 0,
    "dojo-trace-api" : 0,
    "dojo-undef-api" : 0,
    "dojo-v1x-i18n-Api" : 1,
    "dom" : 1,
    "host-browser" : 1,
    "extend-dojo" : 1
  },
  layers : {
    // The module for all of dojo and idx
    'dojo/dojo' : {
      include : [ 'dojo/dojo', 'dojo/parser', 'dojo/_base/window',
          'dojo/_base/lang', 'dojo/query', 'dojo/dom-construct', 'dojo/on',
          'dojo/keys', 'dojo/domReady', 'dojo/dom', 'dojo/_firebug/firebug',
          'dojo/ready', 'dojo/fx/easing',

          'dojox/validate', 'dojox/validate/web', 'dojox/fx', 'dojox/fx/flip',
          
          'dojox/mobile/View', 'dojox/mobile/IconContainer', 'dojox/mobile/IconItem',
          'dojox/mobile/parser', 'dojox/mobile/compat', 'dojox/mobile', 'dojox/mobile/deviceTheme',
          'dojox/mobile/_compat', 'dojox/mobile/_EditableIconMixin', 'dojox/mobile/_IconItemPane',
          'dojox/mobile/ScrollableView',

          'dijit/Dialog', 'dijit/form/Button', 'dijit/form/TextBox',
          'dijit/layout/ContentPane', 'dijit/layout/StackContainer',
          "dijit/form/ValidationTextBox",

          'idx/string', 'idx/layout/ButtonBar', 'idx/layout/ListNavController',
          'idx/layout/HeaderPane', 'idx/layout/BorderContainer',
          'idx/grid/PropertyFormatter', 'idx/grid/PropertyGrid',
          'idx/form/buttons', 'idx/layout/MenuTabController',
          'idx/app/A11yPrologue', 'idx/widget/Menu', 'idx/app/Header' ],
      customBase : true,
      boot : true,
    },

    // The module for all the catalog modules
    'catalog/js/catalogModules' : {
      include : [ 'catalog/js/ToolValidation', 'catalog/js/utils', ],
      exclude : [ 'dojo/dojo' ],
    }
  }
// end layers
};
