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
var curTime = 0; //seconds since start (was startTime in ms, which made days jump back after the 1st frame)

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
state.funds = 50000; //starting funds
state.flights = []; //ships in flight between planets
state.screen = 'game';
state.modal = null; //which planet menu is open (economy / launch)
state.modalPlanet = null; //which planet the open menu is for
state.view = 'planets'; //bottom tab view - planets (list + menus), space (orbit placeholder) or ships (all flights)

//bottom tabs to switch views
var viewTabs = [
    { label : 'planets', view : 'planets', x : 102, y : 568, w : 125, h : 26 },
    { label : 'space',   view : 'space',   x : 237, y : 568, w : 125, h : 26 },
    { label : 'ships',   view : 'ships',   x : 372, y : 568, w : 125, h : 26 }
];

//building settings - build/upgrade cost is cost x next level, max crew (or ships) is perLevel x level
//levelBonus - each level past 1 adds this much to earnings per crew (0.5 = lvl 2 x1.5, lvl 3 x2...)
//each building needs the 'requires' building at level 1+ before it unlocks
var buildingTypes = {
    office :    { cost : 10000, hireCost : 1000, earning : 100, perLevel : 5, levelBonus : 0.5, requires : null },
    mine :      { cost : 20000, hireCost : 2000, earning : 300, perLevel : 5, levelBonus : 0.5, requires : 'office' },
    launchpad : { cost : 30000, hireCost : 1000, earning : 0,   perLevel : 2, levelBonus : 0,   requires : 'mine' } //hireCost here = ship cost
};

//earnings multiplier for a building's current level
var levelMultiplier = function(b){
    return 1 + buildingTypes[b.type].levelBonus * Math.max(b.level - 1, 0);
}

//made up travel days - 100 days per orbit between planets (earth to mars 100, jupiter 200...)
var travelDays = function(from, to){
    return 100 * Math.abs(planetNames.indexOf(from) - planetNames.indexOf(to));
};

//buttons drawn in the open modal this frame, used for clicks
var modalButtons = [];

//modal close (X) button, top right of modal
var modalClose = { x : 515, y : 55, w : 30, h : 30 };

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
    //add income only for new days passed, so hires don't pay out retroactively
    var newDays = Math.round( (curTime / 24) * options.gameSpeed );
    var daysPassed = newDays - state.earthDays;
    state.funds += daysPassed * totalIncome();
    state.earthDays = newDays;

    //move ships in flight, they land on their destination planet when days run out
    state.flights = state.flights.filter(function(ship){
        ship.distanceLeft -= daysPassed;
        if(ship.distanceLeft > 0) return true;
        planets[ship.destination].base.ships.push(ship);
        return false;
    });

    sun.rotation++;
};

// Draw everything
var render = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showBg();
    showText();
    //space view replaces the planet list and menus
    if(state.view === 'space'){
        showSpaceView();
    }else if(state.view === 'ships'){
        showShipView();
    }else{
        showSprites();
        showInterface();
    }
    showTabs();
};

//bottom view tabs - active tab is lighter
var showTabs = function(){
    viewTabs.forEach(function(tab){
        var active = state.view === tab.view;
        ctx.fillStyle = active ? "rgb(200,200,200)" : "rgb(70,70,70)";
        ctx.fillRect(tab.x, tab.y, tab.w, tab.h);
        ctx.fillStyle = active ? "black" : "rgb(170,170,170)";
        ctx.font = "normal 10pt Verdana";
        ctx.textAlign = "center";
        ctx.fillText(tab.label, tab.x + tab.w / 2, tab.y + 18);
        ctx.textAlign = "left";
    });
}

//ship view - every ship in space grouped by route, like the launch menu list but for all planets
var showShipView = function(){
    var x = 60;
    var y = 100;
    ctx.fillStyle = "white";
    ctx.font = "normal 14pt Verdana";
    ctx.fillText('Ships in space: ' + state.flights.length, x, y);

    var groups = flightGroups(state.flights);
    ctx.font = "normal 10pt Verdana";
    y += 35;
    if(groups.length === 0) ctx.fillText('no ships in space', x, y);
    groups.forEach(function(g){
        ctx.fillText(g.route + ': ' + g.count + ' ship' + (g.count > 1 ? 's' : '') + ', ' + g.days + ' days', x, y);
        y += 22;
    });
}

//space view placeholder - small sun in the center, planets on simple circle orbits, outer ones slower
var showSpaceView = function(){
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var seconds = (performance.now() - startTime) / 1000;

    //sun - 100px, spins like the planet view sun
    ctx.setTransform(1, 0, 0, 1, cx, cy);
    ctx.rotate(sun.rotation * Math.PI/180);
    ctx.drawImage( sun.image, -50, -50, 100, 100 );
    ctx.setTransform(1,0,0,1,0,0);

    planetNames.forEach(function(name, i){
        var p = planets[name];
        var orbit = 70 + i * 24; //orbit radius in px
        var angle = i * 0.8 + seconds * 0.6 / (i + 1); //start spread out, outer planets slower
        var x = cx + Math.cos(angle) * orbit;
        var y = cy + Math.sin(angle) * orbit;

        //faint orbit ring
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, orbit, 0, 2 * Math.PI);
        ctx.stroke();

        //planet - same size as the planet view
        ctx.fillStyle = "rgb(150,150,150)";
        ctx.beginPath();
        ctx.arc(x, y, p.spriteRadius, 0, 2 * Math.PI);
        ctx.fill();

        //name label under planet
        ctx.fillStyle = "white";
        ctx.font = "normal 8pt Verdana";
        ctx.textAlign = "center";
        ctx.fillText(name, x, y + p.spriteRadius + 12);
        ctx.textAlign = "left";
    });
}

/**
    FACTORIES
**/

//buildings start at level 0 (not built yet) - settings live in buildingTypes
var buildingFactory = function(type){

    var building = {
        type : type,
        level : 0,
        crew : 0,
    }

    return building;
}

//income per day for one planet - each crew earns their building's rate x level multiplier
var planetIncome = function(p){
    var b = p.base.buildings;
    return Math.round(b.office.crew * buildingTypes.office.earning * levelMultiplier(b.office) + b.mine.crew * buildingTypes.mine.earning * levelMultiplier(b.mine));
}

//income per day across all planets
var totalIncome = function(){
    var total = 0;
    planetNames.forEach(function(name){ total += planetIncome(planets[name]); });
    return total;
}

//a planet has a base (menus unlocked) if it's earth, has ships landed, or has an office
var hasBase = function(p){
    return p.name === 'earth' || p.base.ships.length > 0 || p.base.buildings.office.level > 0;
}

var shipFactory = function(){

    var ship = {
        cost : 1000,
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
            //every planet has each building at level 0 until built
            buildings : { office : buildingFactory('office'), mine : buildingFactory('mine'), launchpad : buildingFactory('launchpad') },
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

    //every planet gets an economy and launch menu button
    planet.buttons.push( buttonFactory('economy',planet) );
    planet.buttons.push( buttonFactory('launch',planet) );


    return planet;
}

var buildPlanets = function(){
    planetNames.forEach(function(element){
        planets[element] = planetFactory(element);
    });
    console.log(planets);
}

var buttonFactory = function(text,planet){
    var textX = 140;
    var buttonWidth = 70;
    var buttonHeight = 20;
    var buttonPadding = 5;

    var button = {
        label : text,
        planet : planet,
        x : planet.x + textX - buttonPadding,
        y : planet.y - buttonPadding,
        w : buttonWidth,
        h : buttonHeight
    }

    //move button over in row
    button.x += (planet.buttons.length * (buttonWidth + buttonPadding) );

    return button;
}

//flights leaving from or heading to a planet
var planetFlights = function(p){
    return state.flights.filter(function(ship){ return ship.origin === p.name || ship.destination === p.name; });
}

//group flights by route (earth → mars) with ship count and days until the next one lands
var flightGroups = function(flights){
    var groups = {};
    flights.forEach(function(ship){
        var route = ship.origin + ' → ' + ship.destination;
        var g = groups[route] = groups[route] || { route : route, count : 0, days : ship.distanceLeft };
        g.count++;
        g.days = Math.min(g.days, ship.distanceLeft);
    });
    return Object.keys(groups).map(function(route){ return groups[route]; });
}

//true if a planet button can't be used - economy needs a base, launch needs a launchpad and ships to send or watch
var buttonDisabled = function(button){
    var p = button.planet;
    if(button.label === 'economy') return !hasBase(p);
    if(button.label === 'launch') return p.base.buildings.launchpad.level < 1 || (p.base.ships.length === 0 && planetFlights(p).length === 0);
    return false;
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

        //short planet summary under the name - income and ships, only once it has a base
        ctx.font = "normal 9pt Verdana";
        if(hasBase(p)){
            ctx.fillText('$' + planetIncome(p).toLocaleString() + '/day', p.x + textX, p.y + 24);
            ctx.fillText(p.base.ships.length + ' ship' + (p.base.ships.length === 1 ? '' : 's'), p.x + textX, p.y + 36);
        }

        //planet menu buttons - darker when disabled
        p.buttons.forEach(function(button){
            var disabled = buttonDisabled(button);
            ctx.fillStyle = disabled ? "rgb(70,70,70)" : "rgb(150,150,150)";
            ctx.fillRect(button.x, button.y, button.w, button.h);

            ctx.fillStyle = disabled ? "rgb(130,130,130)" : "black";
            ctx.font = "normal 10pt Verdana";
            ctx.fillText(button.label, button.x + 4, button.y + 14);
        });

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

        //close X button, highlights on hover
        var c = modalClose;
        var closeHover = mousePos.x > c.x && mousePos.x < c.x + c.w && mousePos.y > c.y && mousePos.y < c.y + c.h;
        ctx.strokeStyle = closeHover ? "rgb(255,80,80)" : "rgb(120,120,120)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(c.x + 8, c.y + 8); ctx.lineTo(c.x + c.w - 8, c.y + c.h - 8);
        ctx.moveTo(c.x + c.w - 8, c.y + 8); ctx.lineTo(c.x + 8, c.y + c.h - 8);
        ctx.stroke();

        ctx.textAlign = "left";
        //ctx.textBaseline = "top";

        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.font = "24px Helvetica";

        verticalOffset += modalOffset;
        var p = planets[state.modalPlanet];
        ctx.fillText(p.name + ' ' + state.modal, horizontalOffset, verticalOffset);

        modalButtons = [];
        if(state.modal === 'economy') showEconomyMenu(p, horizontalOffset, verticalOffset + 40);
        if(state.modal === 'launch') showLaunchMenu(p, horizontalOffset, verticalOffset + 40);
    }
}

//draw a modal button and remember it for clicks - note text goes under the button
var drawModalButton = function(label, x, y, w, disabled, note, action){
    var b = { label : label, x : x, y : y, w : w, h : 20, disabled : disabled, action : action };
    var hover = mousePos.x > b.x && mousePos.x < b.x + b.w && mousePos.y > b.y && mousePos.y < b.y + b.h;

    //faded when disabled, highlight on hover
    ctx.fillStyle = disabled ? "rgb(235,235,235)" : (hover ? "rgb(255,150,150)" : "rgb(200,200,200)");
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.font = "14px Helvetica";
    ctx.fillStyle = disabled ? "rgb(170,170,170)" : "rgb(0,0,0)";
    ctx.fillText(label, b.x + 4, b.y + b.h - 6);
    if(note) ctx.fillText(note, b.x + 4, b.y + b.h + 13);

    modalButtons.push(b);
}

//economy menu - a row per building: build/upgrade, then hire crew (or add ships for launchpad)
var showEconomyMenu = function(p, x, y){
    ['office', 'mine', 'launchpad'].forEach(function(type){
        var b = p.base.buildings[type];
        var t = buildingTypes[type];
        var locked = t.requires && p.base.buildings[t.requires].level < 1;

        ctx.fillStyle = locked ? "rgb(170,170,170)" : "rgb(0,0,0)";
        ctx.font = "18px Helvetica";
        ctx.fillText(type + (b.level ? '  - level ' + b.level : ''), x, y);
        ctx.font = "14px Helvetica";

        if(locked){
            ctx.fillText('locked - build a ' + t.requires + ' first', x, y + 22);
            y += 70;
            return;
        }

        //crew (or ships) vs max for this level
        var isPad = type === 'launchpad';
        var count = isPad ? p.base.ships.length : b.crew;
        var max = b.level * t.perLevel;
        ctx.fillStyle = "rgb(0,90,0)";
        var mult = levelMultiplier(b);
        ctx.fillText((isPad ? 'ships ' : 'crew ') + count + ' / ' + max + (t.earning ? '  ·  $' + Math.round(t.earning * mult) + '/day per crew  (x' + mult + ')' : ''), x, y + 22);

        //upgrade only once crew (or ships) are full - first build has max 0 so it's always allowed
        var buildCost = t.cost * (b.level + 1);
        var notFull = count < max;
        drawModalButton(b.level ? 'upgrade' : 'build', x, y + 35, 100, notFull || state.funds < buildCost, '$' + buildCost.toLocaleString(), function(){
            state.funds -= buildCost;
            b.level++;
        });
        if(notFull){
            ctx.fillStyle = "rgb(170,170,170)";
            ctx.fillText('fill ' + (isPad ? 'ships' : 'crew') + ' to upgrade', x + 240, y + 50);
        }

        drawModalButton(isPad ? 'add ship' : 'hire', x + 120, y + 35, 100, b.level < 1 || count >= max || state.funds < t.hireCost, '$' + t.hireCost.toLocaleString(), function(){
            state.funds -= t.hireCost;
            if(isPad) p.base.ships.push( shipFactory() ); else b.crew++;
        });

        y += 100;
    });
}

//launch menu - destination buttons on the left, ships here and in space on the right
var showLaunchMenu = function(p, x, y){
    planetNames.forEach(function(name){
        var days = travelDays(p.name, name);
        drawModalButton(name, x, y, 100, name === p.name || p.base.ships.length === 0, name === p.name ? 'you are here' : days + ' days', function(){
            //send 1 ship from this planet
            var ship = p.base.ships.pop();
            ship.origin = p.name;
            ship.destination = name;
            ship.distanceLeft = days;
            state.flights.push(ship);
        });
        y += 40;
    });

    //ships in space to or from this planet
    var groups = flightGroups(planetFlights(p));

    var rightX = 300;
    var listY = 140;
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.font = "18px Helvetica";
    ctx.fillText('Ships here: ' + p.base.ships.length, rightX, listY);
    ctx.fillText('In space', rightX, listY + 40);
    ctx.font = "14px Helvetica";
    listY += 65;
    if(groups.length === 0) ctx.fillText('no ships in space', rightX, listY);
    groups.forEach(function(g){
        ctx.fillText(g.route + ': ' + g.count + ' ship' + (g.count > 1 ? 's' : '') + ', ' + g.days + ' days', rightX, listY);
        listY += 22;
    });
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
    
    //overview - right aligned so longer numbers fit
    ctx.textAlign = "right";
    ctx.fillText("Earth Time: " + displayTime + " " + displayTimeLabel, 590, 20);
    ctx.fillText("Funds: $" + state.funds.toLocaleString() + "  (+$" + totalIncome().toLocaleString() + "/day)", 590, 40);
    ctx.textAlign = "left";
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
        var hit = function(b){
            return click.x > b.x && click.x < (b.x + b.w) && click.y > b.y && click.y < (b.y + b.h);
        };

        //modal open - only the close X and the modal's own buttons can be clicked
        if(state.screen === 'modal'){
            if(hit(modalClose)){
                state.screen = 'game';
                return;
            }
            var modalButton = modalButtons.filter(function(b){ return !b.disabled && hit(b); })[0];
            if(modalButton) modalButton.action();
            return modalButton;
        }

        //bottom tabs switch views
        var tab = viewTabs.filter(hit)[0];
        if(tab){
            state.view = tab.view;
            return;
        }
        if(state.view !== 'planets') return; //space and ship views - nothing else to click

        //main screen - planet buttons open that planet's economy or launch menu
        var clicked;
        planetNames.forEach(function(name){
            planets[name].buttons.forEach(function(thisButton){
                if(!buttonDisabled(thisButton) && hit(thisButton)){
                    clicked = thisButton;
                    state.screen = 'modal';
                    state.modal = thisButton.label;
                    state.modalPlanet = name;
                }
            });
        });
        return clicked;
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