/**
    Idle Planets
    v0.1 - 05-11-2021
    Opal Games - Design and Development
    screen: 600px x 600px
    requirements: JS
**/

// main game setup vars
var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext("2d");
var w = window;

// Cross-browser support for requestAnimationFrame
var requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

// helper objects
var gameTools = null;
var gameRules = null;

// timing vars
var then = performance.now();
var modifier = 0;
var delta = 0;
var startTime = performance.now();
var curTime = startTime;

//drawing vars
var gridSize = 40;
var curY = 500;
var curX = 60;
var mousePos = {};

// environment vars
var options = {};
options.gameSpeed = 24; //hours per sec // 24 = 1 day per second

var battleField = {
    size : {width : null, height : null},
    window : {width : null, height : null},
    position : {x : null, y : null},
    zoom : null
};

// key Listeners
var keysDown = [];
addEventListener("keydown", function (e) {
    e.preventDefault();
    keysDown[e.keyCode] = true;
}, false);

addEventListener("keyup", function (e) {
    e.preventDefault();
    delete keysDown[e.keyCode];
}, false);

// mouse listeners
canvas.addEventListener('click', function(e) {
    click = gameTools.getMousePos(canvas,e);
    gameTools.processClick(click);
});

canvas.addEventListener('mousemove', function(e) {
    mousePos = gameTools.getMousePos(canvas,e);
});

////////////////////////////////////////////////////////////////////////////
// GAME

//GLOBAL GAME STATE
var state = {};
state.earthDays = 0;
state.funds = 0;
state.screen = 'game';

//global vars / sprites
var bg = {};

var sun = {
    x : 0,
    y : 0,
    rotation : 0,
    width : 600,
    height : 600,
    image : null,
};

var planets = {};

var planetNames = [
    'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'
];

//START THE GAME
var init = function(){
    gameTools = new gameToolsObject();
    gameRules = new gameRulesObject();
    
    canvas.width = 600;
    canvas.height = 600;
    canvas.id = 'game-canvas';
    canvas.onselectstart = function () { return false; } //stop text select on double click

    buildPlanets();
    loadGraphics();
    resetGame();
    mainLoop();
};

//reset the game for start and reset
var resetGame = function () {
    sun.y = 0;
    sun.x = 0;
    planets.earth.base.buildings.office.crew = 1;
    console.log('here is the state');
    console.log(state);
    //setup the battlefield
    battleField = {
        size : {width : canvas.width, height : canvas.height},
        window : {width : canvas.width, height : canvas.height},
        position : {x : 0, y : 0},
        zoom : 1
    };
};

// Check inputs for how to update sprites
var update = function (modifier) {


    if (27 in keysDown ) {
        state.screen = 'game';
    }

    //timer for earth days
    state.earthDays = ( ( (curTime / 24) ) * options.gameSpeed).toFixed(0);
    state.funds = (state.earthDays * planets.earth.base.buildings.office.earning * planets.earth.base.buildings.office.crew).toFixed(0);

    sun.rotation++;
};

// Draw everything
var render = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showBg();
    showText();
    showSprites();
    showInterface();
};

/**
    FACTORIES
**/

var buildingFactory = function(type){

    var building = {
        type : 'office',
        crew : 1,
        earning : 50, //dollars per earth day per crew
    }
    
    return building;
}

var shipFactory = function(){

    var ship = {
        cost : 1000000,
        fuel : 1000000,
        crew : 1000,
        destination : null,
        distanceLeft : 0
    }

    return ship;
}

var planetFactory = function(name){

    var planet = {
        name : name,
        x : 40,
        y : 600,
        diameter : 8000,
        mass : 100,
        distanceFromSun : 100,
        rotation : 0,
        width : 60,
        height : 60,
        image : null,
        //calculated properties
        spriteDiameter : 20,
        spriteRadius : 10,
        radius : 10,
        xc : 0,
        yc : 0,
        buttons : [],
        base : {
            maxCrew : 10,
            fuel : 0,
            inspiration : 0,
            discontent : 0,
            buildings : {},
            ships : [],
        }
    }

    planet.y = curY;
    planet.x = curX;

    switch(name){
        case 'mercury':
            planet.diameter = 3000;
        break;
        case 'venus':
            planet.diameter = 7500;
        break;

        case 'earth':
            planet.diameter = 8000;
            planet.base.buildings.office = buildingFactory('office');
        break;

        case 'mars':
            planet.diameter = 4000;
        break;

        case 'jupiter':
            planet.diameter = 86000;
        break;
        case 'saturn':
            planet.diameter = 72000;
        break;
        case 'uranus':
            planet.diameter = 31000;
        break;
        case 'neptune':
            planet.diameter = 30000;
        break;
    }

    planet.radius = planet.diameter / 2;
    planet.spriteDiameter = planet.diameter / 500;

    if(planet.spriteDiameter > 50){
       planet.spriteDiameter = planet.spriteDiameter / 3;
    }

    planet.spriteRadius = planet.spriteDiameter / 2;
    planet.xc = planet.x + planet.spriteRadius;
    planet.yc = planet.y + planet.spriteRadius;

    curY -= gridSize * 1.5;
    curX += 0;

    if(name == 'earth'){
        planet.buttons.push( buttonFactory('hire',planet) );
        planet.buttons.push( buttonFactory('build',planet) );
        planet.buttons.push( buttonFactory('launch',planet) );
    }


    return planet;
}

var buildPlanets = function(){
    planetNames.forEach(function(element){
        planets[element] = planetFactory(element);
    });
    console.log(planets);
}

var buttonFactory = function(text,planet,type){
    var textX = 140;
    var buttonWidth = 50;
    var buttonHeight = 20;
    var buttonPadding = 5;

    var button = {
        action : null,
        label : text,
        x : planet.x + textX - buttonPadding,
        y : planet.y - buttonPadding,
        w : buttonWidth,
        h : buttonHeight,
        buttons : []
    }

    if(text === 'build'){
        button.buttons.push( buttonFactory('ship',planet,'build') );
        button.buttons.push( buttonFactory('launchpad',planet,'build') );
        button.buttons.push( buttonFactory('mine',planet,'build') );
    }
 
    if(type === undefined){
        //move button over in row
        button.x += (planet.buttons.length * (buttonWidth + buttonPadding) );
    }else{
        button.x = 80;
        button.y = 80;
        button.w = 100;
    }
 
    return button;
}

// SPRITES
var showSprites = function(){

    //sun
    if(sun.image.src){

        //ctx.fillStyle = "rgb(150,150,150)";
        //ctx.fillRect(sun.x + 10, sun.y + 10, sun.width - 20, sun.height - 20);

        //ctx.translate(canvas.width/2,canvas.height/2);
        ctx.setTransform(1, 0, 0, 1, canvas.width/2, 800); //scale,0,0,scale,x,y
        ctx.rotate(sun.rotation * Math.PI/180);
        ctx.drawImage( sun.image, sun.x - (sun.width / 2), sun.y - (sun.height / 2), sun.width, sun.height );
        ctx.setTransform(1,0,0,1,0,0);

    }else{
        ctx.fillStyle = "rgb(150,150,150)";
        ctx.fillRect(sun.x + 10, sun.y + 10, sun.width - 20, sun.height - 20);
    }

    //planets
    planetNames.forEach(function(element){
        var p = planets[element];
        var textX = 40;
        
        ctx.fillStyle = "rgb(150,150,150)";
        //ctx.fillRect(p.x, p.y, p.spriteDiameter, p.spriteDiameter);

        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.spriteRadius), 0 , 2 * Math.PI);
        ctx.fill();

        //print name
        ctx.fillStyle = "white";
        ctx.font = "normal 11pt Verdana";
        ctx.fillText(element, p.x + textX, p.y + 10);

        textX += 80;

        //planet interface
        if(p.buttons.length > 0 ){
            p.buttons.forEach(function(button){
                
                var buttonLabel = button.label;
    
                //print crew
                ctx.fillStyle = "white";
                ctx.font = "normal 9pt Verdana";
                ctx.fillText('crew: ' + p.base.buildings.office.crew, p.x + 40, p.y + 24);

                //print button
                ctx.fillStyle = "rgb(150,150,150)";
                ctx.fillRect(button.x, button.y, button.w, button.h);
    
                ctx.fillStyle = "black";
                ctx.font = "normal 10pt Verdana";
                ctx.fillText(buttonLabel, button.x + 4, button.y + 14);

                //print buildings
                ctx.fillStyle = "white";
                ctx.font = "normal 9pt Verdana";

                ctx.fillText('max crew: ' + p.base.maxCrew, p.x + 40, p.y + 36);

                //print inspiration
                ctx.fillText('inspiration: ' + p.base.inspiration, p.x + 40, p.y + 48);

            });
        }

    });

};

/**
    INTERFACE
**/
var showInterface = function () {
    /**
        MODAL UI BOX
    **/
    if(state.screen == 'modal'){
        var modalOffset = 50; //inset from canvas
        var verticalOffset = 20;
        var horizontalOffset = 40;
        verticalOffset += modalOffset;
        horizontalOffset += modalOffset;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect( modalOffset, modalOffset, canvas.width - (modalOffset * 2), canvas.height - (modalOffset * 2) );

        ctx.textAlign = "left";
        //ctx.textBaseline = "top";

        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.font = "24px Helvetica";

        verticalOffset += modalOffset;
        ctx.fillText('Build', horizontalOffset, verticalOffset);

        ctx.fillStyle = "rgb(0, 90, 0)";
        ctx.font = "14px Helvetica";

        //loop all planets check for interfaces and buttons
        if(state.screen === 'modal'){
            var loopObj = planetNames;
            var loopLength = loopObj.length;

            var curX = horizontalOffset;
            var curY = verticalOffset;

            loopObj.forEach(function(element){
                var p = planets[element];
                if( p.buttons.length == 0 ) return;
                p.buttons.forEach(function(thisButton){
                    if( thisButton.buttons.length == 0 ) return;
                    thisButton.buttons.forEach(function(modalButton){
                        curY += 30;

                        modalButton.y = curY;

                        //print button
                        //button hover in modal
                        if(
                            mousePos.x > modalButton.x &&
                            mousePos.x < (modalButton.x + modalButton.w) &&
                            mousePos.y > modalButton.y &&
                            mousePos.y < (modalButton.y + modalButton.h)
                        ){
                            ctx.fillStyle = "rgb(255,150,150)";
                        }else{
                            ctx.fillStyle = "rgb(200,200,200)";
                        }
                        ctx.fillRect(modalButton.x, modalButton.y, modalButton.w, modalButton.h);

                        ctx.fillStyle = "rgb(0,0,0)";
                        ctx.fillText(modalButton.label, modalButton.x + 4, modalButton.y + modalButton.h - 6);
                    });
                });
            });
        }

    }
}

// game ui
var showText = function(){
    ctx.fillStyle = "white";
    ctx.font = "normal 11pt Verdana";
    ctx.fillText("Idle Planets", 10, 20);
    //ctx.fillText("Time: " + curTime, 10, 60);
    var displayTime = state.earthDays;
    var displayTimeLabel = "Days";
    
    if(displayTime >= 365){
        displayTime = (state.earthDays / 365).toFixed(2);
        displayTimeLabel = "Years";
    }
    
    ctx.fillText("Earth Time: " + displayTime + " " + displayTimeLabel, 400, 20);
    ctx.fillText("Funds: " + (state.funds), 450, 40);
};

// bg
var showBg = function(){
    if(bg.image.src){
        ctx.drawImage( bg.image, 0, 0, canvas.width, canvas.height );
    }
};

// load graphics
var loadGraphics = function(){
    sun.image = new Image();
    sun.image.src = './images/sun.png';

    bg.image = new Image();
    bg.image.src = './images/bg.png';
}

//sound mixer
var mixer = function(){
    
    var sound01 = document.createElement("audio");
    sound01.src = "sounds/sound-01.mp3";
    
    var playSound01 = function(){
        sound01.play();
    }
    
    return{
        playSound01 : playSound01
    }
}();

// The main game loop
var mainLoop = function () {
    var now = performance.now();
    delta = now - then;
    modifier = delta / 1000; //modifier in seconds
    update(modifier);
    render();
    then = now;
    curTime = Math.floor( (then - startTime) / 1000 );
    requestAnimationFrame(mainLoop);
};

///////////////////////
// RULES
// Game Rules Conroller
// process inputs according to rules

var gameRulesObject = function(){
    
    var checkClickForButton = function(click){

        //loop all planets check for interfaces and buttons
        var loopObj;
        var loopLength;

        //loop all planets check for interfaces and buttons
        loopObj = planetNames;
        loopLength = loopObj.length;

        loopObj.forEach(function(element){
            var p = planets[element];
            if( p.buttons.length == 0 ) return;

            p.buttons.forEach(function(thisButton){

                //SUB loop for modal buttons
                //todo check for each modal screen
                if(state.screen === 'modal' && thisButton.buttons.length > 0){
                    thisButton.buttons.forEach(function(modalButton){
                        var sLeftEdge = modalButton.x;
                        var sTopEdge = modalButton.y;
                        if(
                            click.x > sLeftEdge && click.x < (sLeftEdge + modalButton.w)
                            &&
                            click.y > sTopEdge && click.y < (sTopEdge + modalButton.h)
                        ){
                            console.log('CLICKED A MODAL BUTTON!');
                            console.log(modalButton);
                            switch(modalButton.label){
                                case 'ship':
                                    planets.earth.base.ships++;
                                break;
                                case 'launchpad':
                                    planets.earth.base.buildings.push('launchpad');
                                break;
                                case 'mine':
                                    console.log('build mine');
                                break;
                            }
                            state.screen = 'game'; //close the modal
                            return modalButton;
                        }
                    });
                }

                //sprite: x,y,w,h
                //click: x,y (upper left)
                //check if this sprite was clicked
                //get left and top edge of sprite
                var sLeftEdge = thisButton.x; //thisButton.x - thisButton.w / 2;
                var sTopEdge = thisButton.y; //thisButton.y - thisButton.h / 2;
                if(
                    click.x > sLeftEdge && click.x < (sLeftEdge + thisButton.w)
                    &&
                    click.y > sTopEdge && click.y < (sTopEdge + thisButton.h)
                ){
                    console.log('CLICKED ME!');
                    console.log(thisButton);
                    switch(thisButton.label){
                        case 'hire':
                            planets.earth.base.buildings.office.crew++;
                        break;
                        case 'build':
                            state.screen = 'modal';
                            planets.earth.base.buildings.push('launchpad');
                        break;
                        case 'launch':
                            console.log('launch');
                        break;
                    }
                    return thisButton;
                }

            });
        });
    }

    var processButtonClick = function(thisUnit){
        /**
            process clicked button
        **/
        console.log('blast off!');
    }

    var processBlankClick = function(click){
        //no button is cilcked
        //if a unit is selected try to move

        //see if the click is on the battlefield
        if(
            click.y > battleField.window.height ||
            click.x > battleField.window.width
        ){
            console.log('outside of battlefield');
            return;
        }

    }

    return{
        checkClickForButton : checkClickForButton,
        processBlankClick : processBlankClick,
        processButtonClick : processButtonClick,
    }

}

////////////////////// 
// TOOLS
// Data, Mouse Pos

var gameToolsObject = function(){

    //data, game
    var saveGame = function(saveData){
        console.log('...post save game data:');
        console.log(saveData);
        var url = 'data/save/' + '?t=' + Date.now();
        postJSON(url, saveData);
    }

    var loadGame = function(gameData){
    }

    var processClick = function (click) {
        console.log('process click');
        console.log(click);
        var clickedButton = gameRules.checkClickForButton(click);
        if(clickedButton){
            gameRules.processButtonClick(clickedButton);
        }else{
            gameRules.processBlankClick(click);
        }
    }

    var getJSON = function(url,teamId,teamColor) {
        cl('getting JSON data...');
        $.ajax({
            type: "GET",
            url: url,
            success: function(data){
                console.log('...DONE GETTING JSON:');
                console.log( data );
                state.player[teamColor] = data;
                state.player[teamColor].color = teamColor;
                if(state.gameMode == 'quick'){
                    var data2 = JSON.parse(JSON.stringify(data));
                    state.player.blue = data2;
                    state.player.blue.color = 'blue';
                    //todo prommse instead?
                    gameInterface.clickButtonStartGame();
                }
                return data;
            },
            dataType: "json",
            contentType : "application/json"
        });
        
    }

    var postJSON = function(url, saveData) {

        var sendData = JSON.stringify(saveData);
        $.ajax({
            type: "POST",
            url: url,
            data: sendData,
            success: function(data){
                console.log('...DONE posting data:');
                console.log( data );
            },
            dataType: "json",
            contentType : "application/json"
        });

    }

    var getMousePos = function (canvas,e) {
        var rect = canvas.getBoundingClientRect();
        return {
          x: Math.floor(e.clientX - rect.left),
          y: Math.floor(e.clientY - rect.top)
        };
    }

    //pass in two ojbs, a click or sprite
    //must have x and y properties
    var getDistance = function(one,two){
        var dx = Math.abs(one.x - two.x);
        var dy = Math.abs(one.y - two.y);
        return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    }

    return{
        saveGame : saveGame,
        loadGame : loadGame,
        getMousePos : getMousePos,
        getDistance : getDistance,
        processClick : processClick
    }

}

// Let's play this game!
init();