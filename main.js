
// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, ipcMain} = require('electron')
const SQL = require('node-sqlite-purejs')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
	// Create the browser window.
	mainWindow = new BrowserWindow({width: 800, height: 600})

	// and load the index.html of the app.
	mainWindow.loadFile('index.html')

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null
	})

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
		let tab = [{
				label: 'Sign In',
		}, {
				label: 'Sign Out',
		}, {
				label: 'Volunteer Hours'
		}]

		//const menu = Menu.buildFromTemplate(tab)
		//Menu.setApplicationMenu(null)
		createWindow()
		})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', function () {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow()
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


// create hoursdb table for volunteer hours
let hoursdb;
function table_created(err, result) {
	if (err) {
		return console.error(err);
	}
	console.log('Create table');
	//hoursdb.exec('INSERT');
}

function db_opened(err, db) {
	if(err) {
		throw err;
	}
	hoursdb = db;
	/*
	console.log('hoursdb')
	for (var attr in hoursdb) {
		console.log(`${attr}: ${hoursdb[attr]}`)
	}
	*/
	db.exec('CREATE TABLE hours(project text, id string, date integer, minute integer)', table_created);
}

SQL.open('hours.db', {}, db_opened); // open hoursdb

function execsql(db, stmt, fn) {
	console.log("sql:" + stmt);
	db.exec(stmt, fn);
}

// get message from function status(status) to sign in/out volunteers
ipcMain.on('message', function (event, arg) {

	var d = new Date(); //get current time of when the function is ran
	console.log(arg)

	// recycling sign in/out function
	if (arg.type == "recycling") {
		let signedIn = `SELECT * FROM hours WHERE minute = 0 AND id = "${arg.id}"`;
		if (arg.status == false) {	// signing out recycling volunteers

			hoursdb.exec(signedIn,	function (err, result) {
				if (err) {
					console.error(err)
					throw err;
				}
				console.log(signedIn)
				if (result.length != 1) {		//checking whether volunteer signed in once and did not sign out yet
					console.error(`signin count ${result.length}`)
					event.returnValue = "error: you have either not signed in or have already signed out."
					return;
				}

				/*
				for (var attr in result[0]) {
					console.log(`${attr}: ${result[0][attr]}`)
				}
				*/
				//console.log(`${result[0].date}`)

				var signedInTime = result[0].date
				var newD = (d.getTime()/1000 - signedInTime)/60		//finding the number of minutes recycling volunteers had done this day

				//uploading volunteer minutes to hoursdb
				hoursdb.exec(`UPDATE hours SET minute = ${newD} WHERE minute = 0 AND id = "${arg.id}"`, function (err, result) {
					if (err) {
						console.error(err.message)
						throw err;
					}
					console.log(newD)
				})

				event.returnValue = "You have signed out."
				return;

			})
		} 
		else {		//signing in recycling volunteers
			hoursdb.exec(signedIn, function (err, result) {
				if (err){
					console.error(err)
					throw err;
				}
				console.log(signedIn)
				if (result.length != 0) {	//checking whether this is the first time the volunteer signed in today
					console.error(`recycling signin count ${result.length}`)
					event.returnValue = "error: you have already signed in."
					//console.log(event.returnValue)
					return;
				} else {	//signing in recycling volunteer
					execsql(hoursdb, `INSERT INTO hours VALUES("${arg.type}", "${arg.id}", ${d.getTime()/1000}, 0)`, function (err, result) {
						
						if (err) {
							console.error(err.message)
							throw err;
						}
						console.log(result)
					})

					event.returnValue = "You have signed in."
					return;
				}
			})		
		}
	}

	//signing in beautification volunteers
	else if (arg.type == "beautification") {
		//console.log(`beautification ${arg}`)
		//console.log(`sql INSERT INTO hours VALUES("${arg.type}", "${arg.id}", "${d}", ${arg.minute})`)

		//find if this person signed in the last 24 hours to prevent signing in extra hours
		let signedIn = `SELECT * FROM hours WHERE id = "${arg.id}" AND date > ${d.getTime()/1000 - 60} `;

		hoursdb.exec(signedIn, function (err, result) {
			if (err) {
				console.error(err)
				throw err;
			}

			if (result.length != 0) {	//error for when volunteers already signed in and is trying to sign in again
				console.error(`signin count ${result.length}`)
				event.returnValue = "error: you have already signed in."
				return;
			} else {	// signing in beautification volunteer
				execsql(hoursdb, `INSERT INTO hours VALUES("${arg.type}", "${arg.id}", ${d.getTime()/1000}, ${arg.minute})`, function (err, result) {
					if (err) {
						console.error(err)
						throw err;
					}
					console.log(arg.minute)
		
		
				})

				event.returnValue = "You have signed in."
				return;
			}
		})
		
		
	}


	//event.returnValue = "reply"

})


/*ipcMain.on('already-signed-in', function(event, arg){
	let signedIn = `SELECT * FROM hours WHERE minute = 0 AND id = "${arg.id}"`

	hoursdb.exec(signedIn,	function (err, result) {
		if (err) {
			console.error(err)
			throw err;
		}

		if(result.length == 0) {

		}
		event.returnValue = result
	})
})*/

// getting volunteer hours for a specfic volunteer with an ID, message from getHours() function
let hourswindow
ipcMain.on('getHours', function(event, arg){
	//hoursWindow = new BrowserWindow({width: 400, height: 400})
	//hoursWindow.loadFile('hoursIndex.html')
	//event.returnValue = "showed"

	console.log(`id ${arg.id}`)
	let signedIn = `SELECT * FROM hours WHERE id = "${arg.id}"`;

	hoursdb.exec(signedIn,	function (err, result) {
		if (err) {
			console.error(err)
			throw err;
		}

		event.returnValue = result
	})
})

// get a list of volunteers who did not sign out at the end of the day for function checkSignIn()
ipcMain.on('signed-in-volunteers', function(event, arg){
				let signedIn = `SELECT * FROM hours WHERE minute = 0`;

				hoursdb.exec(signedIn, function (err, result) {
					if (err) {
						console.error(err)
						throw err;
					}

					event.returnValue = result
				})
})

// get total minutes of all volunteers for function checkTotalHours()
ipcMain.on('find-total-hours', function(event, arg){
	let signedIn = `SELECT * FROM hours`;

	hoursdb.exec(signedIn, function (err, result) {
		if (err) {
			console.error(err)
			throw err;
		}

		event.returnValue = result
	})
})

// officers add hours for volunteers who did not sign in for function lateSignIn()
ipcMain.on('add-hour', function(event, arg){
	var d = new Date(arg.time).getTime(); // make daytime-local into a date variable
	execsql(hoursdb, `INSERT INTO hours VALUES("${arg.type}", "${arg.id}", ${d/1000}, ${arg.minutes})`, function (err, result) {
		if (err) {
			console.error(err.message)
			throw err;
		}
	})

	event.returnValue = "Added successfully."
	return;
})