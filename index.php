<?php /* 
    Idle Planets | Idle Web Game
*/ ?>
<html>
    <head>

        <title>Idle Planets | idle web game</title>
        <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        <link rel="stylesheet" type="text/css" href="game.css" media="all" />
        <link href="favicon.ico" rel="shortcut  icon">

    </head>
    <body>

        <div id="game-area" class="game-area">
            <canvas id="game-canvas" class="game-canvas"></canvas>
        </div>

        <div id="game-info" class="game-info">
            <h1>Idle Planets</h1>
            <h2>Run a space exploration company</h2>
        </div>

        <?php include_once('../../lib/includes/opalgames-footer.php'); ?>

        <script src="game.js"></script>

    </body>
</html>