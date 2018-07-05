path = require 'path'


module.exports = (grunt) ->
  require('time-grunt') grunt
  require('load-grunt-tasks') grunt

  grunt.registerTask 'build', ->
    grunt.task.run [
      'coffee'
    ]

  grunt.config.init
    coffee:
      node:
        expand: yes
        flatten: no
        cwd: 'src'
        src: [
          path.join('**', '*.coffee')
        ]
        dest: '.'
        ext: '.js'
