module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ["dist"],
    concat: {
      rtcomm: {
        src: 'src/rtcomm/*.js',
        dest: 'dist/umd/rtcomm.js' 
      },
      rtcomm_final: {
        src: ['dist/umd/util.js', 'dist/umd/connection.js','dist/umd/rtcomm.js'],
        dest: 'dist/rtcomm.js' 
       }
    },
    umd: {
      rtcomm: {
        options: {
          src: 'dist/umd/rtcomm.js',
          objectToExport: '{util: util, connection:connection, EndpointProvider:EndpointProvider}',
          globalAlias: 'rtcomm',
          deps: { 
            'default': ['connection','util'],
            amd: ['connection','util'],
            cjs: ['connection','util'],
            global: ['connection','util']
          }
        }
      },
      connection: {
        options: {
          src:'dist/umd/connection.js',
          objectToExport: '{util: util, connection: {EndpointConnection:EndpointConnection, MessageFactory:MessageFactory, MqttConnection:MqttConnection}}',
          globalAlias: 'rtcomm',
          deps: { 
            'default': ['util'],
            amd: ['util'],
            cjs: ['util'],
            global: ['util']
          }
        }
      },
      util: {
        options: {
          src:'dist/umd/util.js',
          objectToExport: '{util: {Log: Log, RtcommBaseObject:RtcommBaseObject, validateConfig: validateConfig, setConfig:setConfig, applyConfig: applyConfig, generateUUID: generateUUID, generateRandomBytes: generateRandomBytes, whenTrue:whenTrue, makeCopy: makeCopy,combineObjects : combineObjects}}',
          globalAlias: 'rtcomm'
        }
      }
    },
    compress: {
      main: {
        options: {
          archive:'<%= pkg.name %>-<%=pkg.version %>.zip'
        },
        files: [ 
          {src:['dist/**'], dest:'<%= pkg.name %>-<%=pkg.version %>/' },
          {src:['lib/**'], dest:'<%= pkg.name %>-<%=pkg.version %>/' },
          {src:['doc/index.html'], dest:'<%= pkg.name %>-<%=pkg.version %>/' },
          {src:['LICENCE'], dest:'<%= pkg.name %>-<%=pkg.version %>/' },
          {src:['README.md'], dest:'<%= pkg.name %>-<%=pkg.version %>/' },
          {src:['dist/**'], dest:'<%= pkg.name %>-<%=pkg.version %>/' },
          {src:['sample/**'], dest:'<%= pkg.name %>-<%=pkg.version %>/', filter: function(src) { 
            grunt.log.ok(src);
            return /__/.test(src) ? false: true;
          }},
        ]
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['<%= concat.rtcomm_final.dest %>']
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'dist/umd/*.js', 'test/**/*.js'],
      options: {
        reporter: require('jshint-stylish'),
        curly:   true,
        eqeqeq:  true,
        immed:   true,
        latedef: true,
        newcap:  true,
        noarg:   true,
        sub:     true,
        undef:   true,
        boss:    true,
        eqnull:  true,
        browser: true,

        globals: {
            // AMD
            module:     true,
            require:    true,
            requirejs:  true,
            define:     true,

            // Environments
            console:    true,

            // General Purpose Libraries
            $:          true,
            jQuery:     true,

            // Testing
            sinon:      true,
            describe:   true,
            it:         true,
            expect:     true,
            beforeEach: true,
            afterEach:  true
        }
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint', 'qunit']
    },
    jsdoc : {
        dist : {
            src: ['dist/rtcomm.js'], 
            options: {
              destination: 'jsdoc',
              template : "node_modules/grunt-jsdoc/node_modules/ink-docstrap/template",
              configure : "node_modules/grunt-jsdoc/node_modules/ink-docstrap/template/jsdoc.conf.json"
            }
        }
    },
    intern: {
      client: {
        options: {
          // for other available options, see:
          // https://github.com/theintern/intern/wiki/Using-Intern-with-Grunt#task-options
          config: 'tests/intern',
          reporters: [ 'console', 'lcov' ]
        }
      },
      unit: {
        options: {
          // for other available options, see:
          // https://github.com/theintern/intern/wiki/Using-Intern-with-Grunt#task-options
          config: 'tests/intern',
          runner: 'client',
          reporters: [ 'console', 'lcov' ],
          suites: [
          'unit/connection/connection.js',
            'unit/util/util.js',
            'unit/EndpointProvider.js'
          ]
        }
      },
      fat: {
        options: {
          // for other available options, see:
          // https://github.com/theintern/intern/wiki/Using-Intern-with-Grunt#task-options
          config: 'tests/intern',
          runner: 'client',
          reporters: [ 'console', 'lcov' ],
          suites: [
            'functional/connection/MqttConnection.js',
            'functional/connection/EndpointConnection.js',
            'functional/EndpointProvider.js',
            'functional/RtcommEndpoint.js',
            'functional/RtcommEndpoint.chat.js',
            'functional/MqttEndpoint.js',
            'functional/SessionQueue.js'
           ]
        }
      }
    }
  });

  grunt.registerTask("prepareModules", "Finds and prepares modules for concatenation.", function() {
    // get all module directories
    grunt.file.expand({filter: 'isDirectory'},"src/rtcomm/*").forEach(function (dir) {
        // get the module name from the directory name
        var dirName = dir.substr(dir.lastIndexOf('/')+1);
        // get the current concat object from initConfig
        var concat = grunt.config.get('concat') || {};
        // create a subtask for each module, find all src files
        // and combine into a single js file per module
        grunt.log.ok(dirName);
        concat[dirName] = {
            src: [dir + '/**/*.js'],
            dest: 'dist/umd/' + dirName + '.js'
        };

        // add module subtasks to the concat task in initConfig
        grunt.config.set('concat', concat);
    });
});


 require('load-grunt-tasks')(grunt);
  grunt.loadNpmTasks('intern');
  grunt.registerTask('test', ['intern']);

  grunt.registerTask('umdModules', ['prepareModules', 'concat', 'umd']);
  grunt.registerTask('default', ['umdModules', 'concat:rtcomm_final','uglify','jsdoc']);
  grunt.registerTask('lite', ['umdModules', 'concat:rtcomm_final','uglify']);

};
