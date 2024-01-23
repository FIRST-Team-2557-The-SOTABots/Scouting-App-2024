var ss
var sheets
var sheet

/**
 * This program reads a collection of data from a Firebase Database and compiles it into a Google Spreadsheet
 * The data consists of around 30 teams each playing around 14 matches, with each match containing many different pieces of data
 * We compile data for each match, as well as the average among all, and even calculate a trend to see how a team performs over time.
 * 
 * FirebaseApp Library Script ID: 1hguuh4Zx72XVC1Zldm_vTtcUUKUA6iBUOoGnJUWLfqDWx5WlOJHqYkrt KEEP TRACK OF THIS ID!!!
 */

function main () {

  this.ss = SpreadsheetApp.getActiveSpreadsheet() // Create object of the google sheets document

  this.sheets = ss.getSheets() // create object of the spreadsheets in the document

  this.sheet = ss.getActiveSheet() // create object of the active spreadsheet in the document

  var firebaseURL = "https://sotabots-crescendo-scouting-default-rtdb.firebaseio.com/" // create object of the URL to the firebase database

  var base = FirebaseApp.getDatabaseByUrl(firebaseURL) // create instance of the database

  var data = base.getData() // create object of the database data
  var itter = 2 // keep track of what line to write to

  for (const team in data.Teams) { // for every team in the database
    compileData(itter, data["Teams"][team]["Matches"], team) // compile all the data of the current team
    itter++ // move to next line
  }
  setTitles() // write the titles column
}

/**
 * Compiles all of the data of the current team
 * 
 * @param line the current line to write to
 * @param matches the data from the matches played by the team
 * @param teamNumber number of the current team
 */

function compileData(line, matches, teamNumber) {
  var rows = [] // two dimensional array of each piece of data
  var numAmp = 0 // total number of amp notes
  var numSpeaker = 0 // total number of speaker notes
  var numTrap = 0 // total number of trap notes
  var climbPer = 0 // total number of climbs
  var coopPer = 0 // total number of co-ops
  var numYellow = 0 // total number of yellow cards
  var numRed = 0 // total number of red cards
  var avgRank = 0 // total number of rank points
  var winPer = 0 // total number of wins
  var teleCycleTime = 0 // total cycles
  var linearRegressionData = []


  rows.push([teamNumber]) // push team number
  rows.push([""]) // create space for averages
  rows.push([""])
  rows.push([""])
  rows.push([""])
  rows.push([""])
  rows.push([""])
  rows.push([""])
  rows.push([""])
  rows.push([""])
  rows.push([""])
  rows.push([""])
  rows.push([""])
  rows.push([""])
  var matchesPlayed = 0 // keep track of total matches

  for (const currMatch in matches){ // for every match
    var match =  matches[currMatch.toString()] // create match object

    if (match != null) { // if match exists
      matchesPlayed++
      var autoAmpNotes = match["autoAmp"] // create variables for each data piece, set to data from firebase
      var autoSpeakerNotes = match["autoSpeaker"]
      var teleAmpNotes = match["teleAmp"]
      var teleSpeakerNotes = match["teleSpeaker"]
      var trapNotes = match["teleTrap"]
      var totalAmpNotes = autoAmpNotes + teleAmpNotes
      var totalSpeakerNotes = autoSpeakerNotes + teleSpeakerNotes
      var totalNotes = totalAmpNotes + totalSpeakerNotes + trapNotes
      var rankPoints = match["rankingPoints"]
      var malfType = match["malfunction"] == 0 ? "Nothing Wrong" : match["malfunction"]
      var coOp = match["teleCoop"] == 1 ? "Yes" : "No"
      var leave = match["autoLeave"] == 1 ? "Yes" : "No"
      var climb = match["teleClimb"] == 1 ? "Yes" : "No"
      var yellowCard = match["yellowCard"] == 1 ? "Yes" : "No"
      var redCard = match["redCard"] == 1 ? "Yes" : "No"

      // Add match data to totals for averaging
      winPer += match["result"] == "win" ? 1 : match["result"] == "lose" ? 0 : 0.5
      climbPer += climb == "Yes" ? 1 : 0
      coopPer += coOp == "Yes" ? 1 : 0
      numAmp += totalAmpNotes
      numSpeaker += totalSpeakerNotes
      numTrap += trapNotes
      numYellow += match["yellowCard"]
      numRed += match["redCard"]
      avgRank += rankPoints
      teleCycleTime += (teleAmpNotes + teleSpeakerNotes) == 0 ? 0 : 120 / (teleAmpNotes + teleSpeakerNotes)

      linearRegressionData.push(totalNotes)

      // Add match data to rows array to be printed
      rows.push([currMatch])
      rows.push([match["pose"]])
      rows.push([match["result"]])
      rows.push([rankPoints])
      rows.push([totalNotes])
      rows.push([autoSpeakerNotes])
      rows.push([autoAmpNotes])
      rows.push([teleSpeakerNotes])
      rows.push([teleAmpNotes])
      rows.push([coOp])
      rows.push([leave])
      rows.push([climb])
      rows.push([trapNotes])
      rows.push([malfType])
      rows.push([yellowCard])
      rows.push([redCard])
      rows.push([""])
    }
  }

  
  // set the averages section of the team
  rows[1] = [(winPer / matchesPlayed) * 100]
  rows[2] = [matchesPlayed < 2 ? 0 : calculateLinearRegression(linearRegressionData)]
  rows[3] = [matchesPlayed]
  rows[4] = [avgRank / matchesPlayed]
  rows[5] = [numSpeaker / matchesPlayed]
  rows[6] = [numAmp / matchesPlayed]
  rows[7] = [numTrap / matchesPlayed]
  rows[8] = [teleCycleTime / matchesPlayed]
  rows[9] = [(climbPer / matchesPlayed) * 100]
  rows[10] = [(coopPer / matchesPlayed) * 100]
  rows[11] = [numYellow]
  rows[12] = [numRed]
  dataRange = sheet.getRange(1, line, rows.length, 1)
  dataRange.setValues(rows)
}


/**
 * Calculates the linear regression of a given array of data.
 * @param arr an array of the total number of notes scored in each match
 * @return the slope value of the trendline of data. more positive = increasing over time, more negative = decreasing over time
 */
function calculateLinearRegression (arr) {

  // calculate the means of the x (match #) and y (notes scored) variables
  var yMean = 0
  var xMean = 0
  for (let i = 0; i < arr.length; i++) {
    yMean += arr[i]
    xMean += i
  }
  yMean /= arr.length
  xMean /= arr.length

  // calculate each part of the pearson correlation coefficient
  var sumXY = 0
  var sumX2 = 0
  var sumY2 = 0
  for (let i = 0; i < arr.length; i++) {
    var xDiff = i - xMean // difference from x and its mean
    var yDiff = arr[i] - yMean // difference from y and its mean
    sumXY += xDiff * yDiff // sum of both differences
    sumX2 += xDiff * xDiff // sum of x difference squared
    sumY2 += yDiff * yDiff // sum of y difference squared
  }
  var r = sumXY / Math.sqrt(sumX2 * sumY2) // pearson correlation coefficient

  // calculate the standard deviation of x and y
  var stdvX = Math.sqrt(sumY2 / (arr.length - 1)) 
  var stdvY = Math.sqrt(sumX2 / (arr.length - 1))

  return r * (stdvY/stdvX) // linear regression slope formula 
}
 
function setTitles() {
  var titles = ["Match", "Position", "Result", "Rank Pts", "Total Notes", "Auto Speakers", "Auto Amps", 
  "Tele Speakers", "Tele Amps",  "Co-op", "Leave", "Climb", "Trap Notes", "Malfunction Type", "Yellow Card", "Red Card", ""]

  var titlesArray = []
  titlesArray.push(["Team"])
  titlesArray.push(["Win %"])
  titlesArray.push(["Trend"])
  titlesArray.push(["Total Matches"])
  titlesArray.push(["Avg. Rank Points"])
  titlesArray.push(["Avg. Speaker Notes"])
  titlesArray.push(["Avg. Amp Notes"])
  titlesArray.push(["Avg. Trap Notes"])
  titlesArray.push(["Est. Cycle Time"])
  titlesArray.push(["Climb %"])
  titlesArray.push(["Co-op %"])
  titlesArray.push(["Yellow Cards"])
  titlesArray.push(["Red Cards"])
  titlesArray.push([""])

  // create the list of titles for each data piece
  for (var i = 0; i < titles.length * 16; i++) {
    titlesArray.push([titles[i % titles.length]])
  }

  // find the range and set the data to the titles array
  dataRange = sheet.getRange(1, 1, titlesArray.length, 1)
  dataRange.setValues(titlesArray)

}
