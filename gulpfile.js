let gulp = require('gulp')
let ts = require('gulp-typescript')

let tsProject = ts.createProject("tsconfig.json")
var run = require('gulp-run')
var bump = require('gulp-bump');
var git  = require('gulp-git');
var gutil = require('gulp-util');
var filter = require('gulp-filter');
var exec = require('child_process').exec;
var argv = require('yargs')
    .option('type', {
        alias: 't',
        choices: ['patch', 'minor', 'major']
	})
	.option('note', {
		alias: 'm',
		description: 'Release Note text.',
		type: 'string'
	})
	.argv;
var tag = require('gulp-tag-version');
var push = require('gulp-git-push');

gulp.task('default', ['watch'], function () {
	console.log('shuru')
})

gulp.task('test', function(){
	let jest = new run.Command('jest')
	jest.exec()
})

// Transpile typescript to javascript
gulp.task('transpile', function tsToJs()  {
	return tsProject.src()
	.pipe(tsProject())
	.js.pipe(gulp.dest('dist'))
})

// Poll for changes in the typescript files and then act as configured 
gulp.task('watch', function () {
	gulp.watch(['lib/**/*.ts', 'lib/*.ts'], ['transpile'])
})

gulp.task('bump', ['transpile'], function() {
	return gulp.src('./package.json')
		// bump package.json and bowser.json version
		.pipe(bump({
			type: argv.type || 'patch'
		}))
		// save the bumped files into filesystem
		.pipe(gulp.dest('./'))
		// commit the changed files
		.pipe(git.commit('Bumped up the version.'))
		// filter one file
		.pipe(filter('package.json'))
		// create tag based on the filtered file
		.pipe(tag({
			label: argv.note || undefined
		}))
		// push changes into repository
		.pipe(push({                      
			repository: 'origin',
			refspec: 'HEAD'
		}))
});

gulp.task('publish', ['bump'], function (done) {
	// run npm publish terminal command
	exec('npm publish',
		function (error, stdout, stderr) {
			if (stderr) {
				gutil.log(gutil.colors.red(stderr));
			} else if (stdout) {
				gutil.log(gutil.colors.green(stdout));
			}
			// execute callback when its done
			if (done) {
				  done();
			}
		}
	);
});
   
gulp.task('release', ['publish'], function () {
	gutil.log(gutil.colors.green.green("RELEASED! & PUBLISHED!"))
});