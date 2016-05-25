module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ["dist"],
    concat: {
      rtcomm: {
        src: 'src/rtcomm/*.js',
        dest: 'dist/umd/rtcomm.js'
      },
      mocks: {
        src: 'src/mock/*.js',
        dest: 'dist/mock/mockMqtt.js'
      },
      rtcomm_final: {
        options: {
          banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("UTC:dd-mm-yyyy HH:MM:ss Z") %> */\nconsole.log(\'<%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("UTC:dd-mm-yyyy HH:MM:ss Z") %>\');\n'
        },
        src: ['dist/umd/rtcomm/util.js', 'dist/umd/rtcomm/connection.js', 'dist/umd/rtcomm/EndpointProvider.js', 'dist/umd/rtcomm.js'],
        dest: 'dist/rtcomm.js'
      }
    },
    umd: {
      rtcomm: {
        options: {
          src: 'dist/umd/rtcomm.js',
          globalAlias: 'rtcomm',
          template: 'build_resources/umd.hbs',
          deps: {
            'default': ['EndpointProvider', 'connection', 'util'],
            amd: ['./rtcomm/EndpointProvider', './rtcomm/connection', './rtcomm/util'],
            cjs: ['./rtcomm/EndpointProvider', './rtcomm/connection', './rtcomm/util'],
            global: ['rtcomm.EndpointProvider', 'rtcomm.connection', 'rtcomm.util']
          }
        }
      },
      mock: {
        options: {
          src: 'dist/mock/mockMqtt.js',
          globalAlias: 'Paho',
          objectToExport: 'Paho',
          deps: {
            'default': ['connection', 'util'],
            amd: ['../umd/rtcomm/connection', '../umd/rtcomm/util'],
            cjs: ['../umd/rtcomm/connection', '../umd/rtcomm/util'],
            global: ['rtcomm.connection', 'rtcomm.util']
          }
        }
      },
      endpoint_provider: {
        options: {
          src: 'dist/umd/rtcomm/EndpointProvider.js',
          objectToExport: 'EndpointProvider',
          globalAlias: 'rtcomm',
          template: 'build_resources/umd.hbs',
          deps: {
            'default': ['connection', 'util'],
            amd: ['./connection', './util'],
            cjs: ['./connection', './util'],
            global: ['rtcomm.connection', 'rtcomm.util']
          }
        }
      },
      connection: {
        options: {
          src: 'dist/umd/rtcomm/connection.js',
          objectToExport: 'connection',
          globalAlias: 'rtcomm',
          template: 'build_resources/umd.hbs',
          deps: {
            'default': ['util'],
            amd: ['./util'],
            cjs: ['util'],
            global: ['rtcomm.util']
          }
        }
      },
      util: {
        options: {
          src: 'dist/umd/rtcomm/util.js',
          template: 'build_resources/umd.hbs',
          objectToExport: 'util',
          globalAlias: 'rtcomm'
        }
      }
    },
    compress: {
      main: {
        options: {
          archive: 'dist/release/<%= pkg.name %>-sample-<%=pkg.version %>.zip'
        },
        files: [{
          expand: true,
          cwd: 'dist/',
          src: ['*.js'],
          dest: '<%= pkg.name %>-<%=pkg.version %>/dist'
        }, {
          expand: true,
          cwd: 'dist/jsdoc',
          src: ['**'],
          dest: '<%= pkg.name %>-<%=pkg.version %>/jsdoc'
        }, {
          expand: true,
          cwd: './build_resources/doc/',
          src: ['index.html'],
          dest: '<%= pkg.name %>-<%=pkg.version %>/'
        }, {
          src: ['LICENCE'],
          dest: '<%= pkg.name %>-<%=pkg.version %>/'
        }, {
          src: ['README.md'],
          dest: '<%= pkg.name %>-<%=pkg.version %>/'
        }, {
          src: ['sample/**'],
          dest: '<%= pkg.name %>-<%=pkg.version %>/',
          filter: function(src) {
            grunt.log.ok(src);
            return /__/.test(src) ? false : true;
          }
        }, ]
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("UTC:dd-mm-yyyy HH:MM:ss Z") %> */\n'
      },
      dist: {
        files: {
          'dist/rtcomm.min.js': ['<%= concat.rtcomm_final.dest %>']
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'dist/umd/*.js', 'test/**/*.js'],
      options: {
        reporter: require('jshint-stylish'),
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true,

        globals: {
          // AMD
          module: true,
          require: true,
          requirejs: true,
          define: true,

          // Environments
          console: true,

          // General Purpose Libraries
          $: true,
          jQuery: true,

          // Testing
          sinon: true,
          describe: true,
          it: true,
          expect: true,
          beforeEach: true,
          afterEach: true
        }
      }
    },
    watch: {
      files: ['src/**/*.js'],
      tasks: ['build'],
    },
    jsdoc: {
      dist: {
        src: ['src/rtcomm/*.js', 'src/rtcomm/**/*.js', '!src/rtcomm/**/__*.js'],
        options: {
          destination: 'dist/jsdoc',
          configure: "build_resources/jsdoc.conf.json",
          private: false,
        }
      }
    },
    intern: {
      base: {
        options: {
          // for other available options, see:
          // https://github.com/theintern/intern/wiki/Using-Intern-with-Grunt#task-options
          config: 'tests/intern',
          runner: 'client',
          reporters: ['Pretty']
        }
      },
      unit: {
        options: {
          // for other available options, see:
          // https://github.com/theintern/intern/wiki/Using-Intern-with-Grunt#task-options
          config: 'tests/intern',
          runner: 'client',
          reporters: ['Pretty'],
          suites: ['unit/all.js']
        }
      },
      stress: {
        options: {
          // for other available options, see:
          // https://github.com/theintern/intern/wiki/Using-Intern-with-Grunt#task-options
          config: 'tests/intern_stress',
          runner: 'client',
          reporters: ['Pretty'],
          suites: [
            'stress/stressTest.js'
          ]
        }
      },
      fat: {
        options: {
          // for other available options, see:
          // https://github.com/theintern/intern/wiki/Using-Intern-with-Grunt#task-options
          config: 'tests/intern',
          runner: 'client',
          reporters: ['Pretty'],
          suites: ['tests/functional/all.js']
        }
      },
      fat_rtcomm_server: {
        options: {
          // for other available options, see:
          // https://github.com/theintern/intern/wiki/Using-Intern-with-Grunt#task-options
          config: 'tests/intern',
          runner: 'client',
          reporters: ['Pretty'],
          suites: ['tests/functional/all_with_server.js']
        }
      }
    }
  });

  grunt.registerTask("prepareModules", "Finds and prepares modules for concatenation.", function() {
    // get all module directories
    grunt.file.expand({
      filter: 'isDirectory'
    }, "src/rtcomm/*").forEach(function(dir) {
      // get the module name from the directory name
      var dirName = dir.substr(dir.lastIndexOf('/') + 1);
      // get the current concat object from initConfig
      var concat = grunt.config.get('concat') || {};
      // create a subtask for each module, find all src files
      // and combine into a single js file per module
      var fileList = [];
      grunt.file.expand({
        filter: 'isFile'
      }, dir + "/**/*.js").forEach(function(file) {
        if (/ModuleGlobal/.test(file)) {
          fileList.unshift(file);
        } else if (!/__/.test(file)) {
          fileList.push(file);
        }
      });
      grunt.log.ok(dirName);
      concat[dirName] = {
        src: fileList,
        dest: 'dist/umd/rtcomm/' + dirName + '.js'
      };
      // add module subtasks to the concat task in initConfig
      grunt.config.set('concat', concat);
    });
  });

  require('load-grunt-tasks')(grunt);
  grunt.loadNpmTasks('intern');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('test', ['intern:base']);
  grunt.registerTask('release', ['default', 'compress']);
  grunt.registerTask('umdModules', ['clean', 'prepareModules', 'concat', 'umd']);
  grunt.registerTask('build', ['umdModules', 'concat:rtcomm_final']);
  grunt.registerTask('lite', ['umdModules', 'concat:rtcomm_final', 'uglify']);
  grunt.registerTask('default', ['clean', 'lite', 'jsdoc']);
};
