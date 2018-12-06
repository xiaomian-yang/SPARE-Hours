
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
	db.exec('CREATE TABLE hours(project text, id string, date text, minute integer)', table_created);
}

SQL.open('hours.db', {}, db_opened);


ipcMain.on('message', function (event, arg) {

  var d = new Date();

  if (arg.type == "recycling") {
    let signedIn = `SELECT * FROM hours WHERE minute = 0 AND id = "${arg.id}"`;
    if (arg.status == false) {

      hoursdb.exec(signedIn,  function (err, result) {
        if (err) {
          console.error(err)
          throw err;
        }

        if (result.length != 1) {
          console.error(`signin count ${result.length}`)
          throw 'Invalid'
        }
        /*
        for (var attr in result[0]) {
          console.log(`${attr}: ${result[0][attr]}`)
        }
        */
        var signedInTime = result[0].date
        var newD = (d.getTime()/1000 - signedInTime)/60
        hoursdb.exec(`UPDATE hours SET minute = "${newD}" WHERE minute = 0 AND id = "${arg.id}"`, function (err, result) {
          if (err) {
            console.error(err.message)
            throw err;
          }
          console.log(newD)
        })

      })
    } else {
      hoursdb.exec(`INSERT INTO hours VALUES("${arg.type}", "${arg.id}", "${d.getTime()/1000}", 0)`, function (err, result) {
        if (err) {
          console.error(err.message)
          throw err;
        }
        console.log(result)
      })
    }
  }
  else if (arg.type == "beautification") {
    console.log(`beautification ${arg}`)
    console.log(`sql INSERT INTO hours VALUES("${arg.type}", "${arg.id}", "${d}", ${arg.minute})`)
    hoursdb.exec(`INSERT INTO hours VALUES("${arg.type}", "${arg.id}", "${d.getTime()/1000}", ${arg.minute})`, function (err, result) {
      if (err) {
        console.error(err)
        throw err;
      }
      console.log(arg.minute)

      event.returnValue = result
    })
  }


  event.returnValue = "reply"

})

let hourswindow
ipcMain.on('getHours', function(event, arg){
  //hoursWindow = new BrowserWindow({width: 400, height: 400})
  //hoursWindow.loadFile('hoursIndex.html')
  //event.returnValue = "showed"

  console.log(`id ${arg.id}`)
  let signedIn = `SELECT * FROM hours WHERE id = "${arg.id}"`;

  hoursdb.exec(signedIn,  function (err, result) {
    if (err) {
      console.error(err)
      throw err;
    }

    event.returnValue = result
  })


/*
  for (var i = 0, length = signedIn.length; i < length; i++) {
    hoursdb.exec(`UPDATE hours SET minute = ${estimateHours(signedIn[i].minute)} WHERE minute = ${signedIn[i].minute} AND id = "${arg.id}"`, function (err, result) {
      if (err) {
        console.error(err.message)
        throw err;
      }
    })

  }*/
})

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
// below is not needed
/*
ipcMain.on('sign in', function (event, arg) {
  var d = new
  console.log(`exec INSERT INTO hours VALUES("${arg.type}", "${arg.id}", "${arg.date}", "${arg.hour}", "${arg.minute}", "sign-in"`)
  hoursdb.exec(`INSERT INTO hours VALUES("${arg.type}", "${arg.id}", "${arg.date}", "${arg.hour}", "${arg.minute}", "sign-in")`, function (err, result) {
    if (err) {
      console.error(err.message)
      throw err;
    }
    console.log(result)
    event.returnValue = "signed-in"
  })
})

ipcMain.on('sign out', function (event, arg) {
  console.log(`exec INSERT INTO hours VALUES("${arg.type}", "${arg.id}", "${arg.date}", "${arg.hour}", "${arg.minute}", "sign-in"`)
  hoursdb.exec(`INSERT INTO hours VALUES("${arg.type}", "${arg.id}", "${arg.date}", "${arg.hour}", "${arg.minute}", "sign-out")`, function (err, result) {
    if (err) {
      console.error(err.message)
      throw err;
    }
    console.log(result)
    event.returnValue = "signed-out"
  })
})

}
*/
