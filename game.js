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

// environment vars
var options = {};
options.gameSpeed = 4; //1 min = 1 hour

//game state
var state = {};
state.earthDays = 0;
state.funds = 0;

//sprites
var bg = {};

var sun = {
    x : 0,
    y : 0,
    rotation : 0,
    width : 600,
    height : 600,
    image : null,
};

var planetNames = [
    'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'
];

var planets = {};

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
        yc : 0
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
    
    planet.interface = interfaceFactory();
    planet.interface.buttons.push( buttonFactory('test') );
    planet.interface.buttons.push( buttonFactory('test2') );

    return planet;
}

var buildPlanets = function(){
    planetNames.forEach(function(element){
        planets[element] = planetFactory(element);
    });
    console.log(planets);
}

var interfaceFactory = function(){
    var interface = {
        buttons : []
    }
    return interface;
}

var buttonFactory = function(text){
    var button = {
        action : null,
        label : text
    }
    return button;
}

// key Listeners
var keysDown = {};

addEventListener("keydown", function (e) {
    e.preventDefault();
    keysDown[e.keyCode] = true;
}, false);

addEventListener("keyup", function (e) {
    e.preventDefault();
    delete keysDown[e.keyCode];
}, false);

// Cross-browser support for requestAnimationFrame
var requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

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

//start the game to play
var init = function(){
    canvas.width = 600;
    canvas.height = 600;
    canvas.id = 'game-canvas';

    buildPlanets();

    //load graphics
    sun.image = new Image();
    sun.image.src = './images/sun.png';

    bg.image = new Image();
    bg.image.src = './images/bg.png';
    
    resetGame();
    mainLoop();
};

//reset the game for start and reset
var resetGame = function () {
    sun.y = 0;
    sun.x = 0;
};

// Check inputs for how to update sprites
var update = function (modifier) {

    //timer for earth days
    state.earthDays = ( ( (curTime / 24) ) * options.gameSpeed).toFixed(2);
    state.funds = (state.earthDays * 1000).toFixed(0);

    sun.rotation++;
};

// Draw everything
var render = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showBg();
    showText();
    showSprites();
};

// game sprites
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
        var buttonWidth = 50;
        var buttonHeight = 20;
        var buttonPadding = 5;
        
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
        if(p.interface.buttons.length > 0 ){
            var buttonLabel = p.interface.buttons[0].label;

            //print button
            ctx.fillStyle = "rgb(150,150,150)";
            ctx.fillRect(p.x + textX - buttonPadding, p.y - buttonPadding, buttonWidth, buttonHeight);

            ctx.fillStyle = "black";
            ctx.font = "normal 10pt Verdana";
            ctx.fillText(buttonLabel, p.x + textX, p.y + 10);

        }

    });

};

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

// Let's play this game!
init();