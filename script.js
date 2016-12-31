window.onload = function(){
//Cell template
var cellTemplate = {
    SIZE: 100,
    CHECKED: 1,
    UNCHECKED: 0,
    state: undefined,
    symbol: undefined,
    reset: function(){
        this.state = this.UNCHECKED;
        this.owner = undefined;
    }
}

//Game Map
var ROWS = 3;
var COLUMNS = 3;
var SIZE = cellTemplate.SIZE;
var SPACE = 5;

//Cells List, cells canvases list, cells drawing surfaces lists
var cellsList = [];
var cellsCanvases = [];
var cellsCtxs = [];

//Game state
var state = {
    intelligence: 6, //Game difficulty
    combos: [], //All possible winning combos 
    board: [], //The game board state
    reset: function(){
        this.board = [];
    },
    undef: undefined
}
//--------------------------------------------------------
//Calculate all winning combos
//c[] and d[]: contains board diagonals indexes
//a[]: rows indexes
//b[]: columns indexes
for(i = 0, c = [], d = []; i < ROWS; i++){
    for(j = 0, a = [], b = []; j < ROWS; j++){
        a.push(i * ROWS + j);
        b.push(j * ROWS + i);
    }
    state.combos.push(a, b);
    c.push(i * ROWS + i);
    d.push((ROWS - i -1) * ROWS + i);
}
state.combos.push(c, d);
// console.log(state.combos);
//-----------------------------------------------------------

//Circle or Cross symbol, depending on player initial choice
//Each time an actor select a cell, the cell's symbol become the actor's symbol
//Used by the render function to draw either a circle or a cross
var symbols = {
    player: undefined,
    cpu: undefined
};

//Who wins, used by endGame function
var winner = {
    player: false,
    cpu: false,
    reset: function(){
        this.player = false;
        this.cpu = false;
    }
};

//Utility variables, such as score, number of moves and game message
var game = {
    score: 0,
    reset: function(){
        this.gameMessage = "";
        this.round = 0;
    },
    WIN_SCORE: 1000,
    DRAW_SCORE: 100,
    LOST_SCORE: 10,
    gameMessage: "",
    round:0,
    updateRound: function(){
        this.round++;
    },
    updateScore: function(){
        if(winner.player){
            this.score += Math.floor(this.WIN_SCORE/(this.round + turnTimer.time));
            this.gameMessage = "You Win.";
        }else if(winner.cpu){
            this.score += Math.floor(this.LOST_SCORE/(this.round + turnTimer.time));
            this.gameMessage = "You Loose.";
        }else{
            this.score += Math.floor(this.DRAW_SCORE/(this.round + turnTimer.time));
            this.gameMessage = "Draw.";
        }
    }
}

//The game timer, time spent playing
var turnTimer = {
    time: 0,
    interval: undefined,
    start: function(){
        var self = this;
        this.interval = setInterval(function(){
            self.tick();
        },1000);
    },
    tick: function(){
        this.time++;
        timeOutput.innerHTML = this.time;
    },
    stop: function(){   
        clearInterval(this.interval);
    },
    reset: function(){
        this.time = 0;
        timeOutput.innerHTML = 0;
    }
}

///////////////////////////////////////////////////////////////////////////

/////////////////////
//Welcome Message
/////////////////////
//Get a reference for player's choice
var welcome = document.querySelector("div[data-welcome]");
welcome.style.width = welcome.style.height = (SIZE * 3 + SPACE * 2) + "px";
var btnForCircle = document.querySelector("button[data-circle]");
var btnForCross = document.querySelector("button[data-cross]");

btnForCircle.addEventListener("click", clickHandler, false);
btnForCross.addEventListener("click", clickHandler, false);
//Store the player's choice then hide the welcome message
function clickHandler(e){
    turnTimer.start();
    if(e.target.hasAttribute("data-circle")){
        symbols.player = "circle";
        symbols.cpu = "cross";
        welcome.style.top = -1000 + "px";
        btnForCircle.removeEventListener("click", clickHandler, false);
        btnForCross.removeEventListener("click", clickHandler, false);
    }else if(e.target.hasAttribute("data-cross")){
        symbols.player = "cross";
        symbols.cpu = "circle";
        welcome.style.top = -1000 + "px";
        btnForCircle.removeEventListener("click", clickHandler, false);
        btnForCross.removeEventListener("click", clickHandler, false);
    }
}
////////////////////////////////////////////////////////////////////////////

/////////////////////////
//Game Info
////////////////////////

//Get a reference for game Info
var banner = document.querySelectorAll(".banner");
banner.forEach(function(element){
    element.style.width = (SIZE * 3 + SPACE * 2) + "px";
});

var scoreOutput = document.querySelector("span[data-score]");
var roundOutput = document.querySelector("span[data-round]");
var timeOutput = document.querySelector("span[data-time]");
var endGameMessage = document.querySelector("span[data-message]");

function updateOutput(){
    scoreOutput.innerHTML = game.score;
    roundOutput.innerHTML = game.round;
    endGameMessage.innerHTML = game.gameMessage;
}

///////////////////////////////////////////////////////////////////////////

//////////////////////////
//Game Stage
/////////////////////////
//Get a reference for the game stage

var stage = document.querySelector("#stage");
stage.style.width = stage.style.height = (SIZE * 3 + SPACE * 2) + "px";

//Build the game Map
//A mousedown event listener is attached to each canvas
function buildMap(){
    for(var row = 0; row < ROWS; row++){
        for(var column = 0; column < COLUMNS; column++){
            var newCell = Object.create(cellTemplate);
            newCell.state = newCell.UNCHECKED;
            cellsList.push(newCell);
            var canvas = document.createElement("canvas");
            canvas.setAttribute("class", "cell");
            canvas.setAttribute("width", SIZE);
            canvas.setAttribute("height", SIZE);
            canvas.addEventListener("mousedown", mouseDownHandler, false);
            cellsCanvases.push(canvas);
            stage.appendChild(canvas);
            canvas.style.top = row * (SIZE + SPACE) + "px";
            canvas.style.left = column * (SIZE + SPACE) + "px";
            var ctx = canvas.getContext("2d");
            cellsCtxs.push(ctx);
        }
    }
}
////////////////////////////////////////////////////////////////////////////
//////////////////////////////////
//Gameplay functions
/////////////////////////////////

//The Player begins 
function mouseDownHandler(e){
    var next;
    var targetedCanvas = e.target;
    var move = cellsCanvases.indexOf(targetedCanvas);
    if(!state.board[move]){
        disableClicks();
        state.board[move] = -1; //-1: player value
        game.updateRound();
        cellsList[move].state = cellsList[move].CHECKED;
        cellsList[move].symbol = symbols.player;
        render();
        if(chk(0) < 0){ //the player won
            winner.player = true;
            return endGame();
        }
        next = search(0, 1, -SIZE, SIZE);
        if(next === state.undef){ //Draw
            return endGame();
        }
        state.board[next] = 1; //1: cpu value
        cellsList[next].state = cellsList[next].CHECKED;
        cellsList[next].symbol = symbols.cpu;
        render();
        if(chk(0) > 0){
            winner.cpu = true;
            return endGame();
        }
        setTimeout(enableClicks, 300);
    }
}

//Check if game won
function chk(depth){
    for (z in state.combos){
        j = x = o = ROWS;
        while(j--){
            k = state.combos[z][j];
            state.board[k] > 0 && x--;
            state.board[k] < 0 && o--;
        }
        if (!x) return SIZE - depth; // x won
        if (!o) return depth - SIZE; // o won
    }
}

//Negamax search with alpha-beta pruning
function search(depth, player, alpha, beta){
    var i = ROWS * ROWS, min = -SIZE, max, value, next;
    if (value = chk(depth)) // either player won
        return value * player;
    if (state.intelligence > depth){ // recursion cutoff
        while(i--){
            if (!state.board[i]){
                state.board[i] = player;
                value = -search(depth + 1, -player, -beta, -alpha);
                state.board[i] = state.undef;
                if (max === state.undef || value > max) max = value;
                if (value > alpha) alpha = value;
                if (alpha >= beta) return alpha; // prune branch
                if (max > min){ min = max; next = i; } // best odds for next move
            }
        }		
    } 
    return depth ? max || 0 : next; // 0 is tie game
}

/////////////////////////////////////////////////////////////////////////////

//Prevent player from clicking while cpu's turn or at game end 
function disableClicks(){
    cellsCanvases.forEach(function(canvas){
        canvas.classList.add("unclickable");
    })
}

//Enable player to click
function enableClicks(){
    cellsCanvases.forEach(function(canvas){
        canvas.classList.remove("unclickable");
    })
}

//Restart the game
function restart(){
    cellsList.forEach(function(cell, i){
        cell.reset();
        cellsCtxs[i].clearRect(0,0,cell.SIZE, cell.SIZE);
    })
    game.reset();
    state.reset();
    winner.reset();
    turnTimer.reset();
    updateOutput();
    enableClicks();
    turnTimer.start();
}

//Whenever it is a tie, win or loss
function endGame(){
    disableClicks();
    turnTimer.stop();
    game.updateScore();
    render();
    setTimeout(restart, 2000);
}

///////////////////////////
//Rendering functions
//////////////////////////
//Display the cell's state, draw in a circle or a cross
function render(){
    updateOutput();
    cellsCtxs.forEach(function(ctx, i){
        var cell = cellsList[i];
        if(cell.state === cell.CHECKED){
            if(cell.symbol === "circle"){
                var angleStart = 0;
                drawCircle(ctx, cell.SIZE, cell.SIZE, angleStart);
            }else if(cell.symbol === "cross"){
                var length = Math.round(cell.SIZE / 6 * 2) ;
                var sourceX = Math.round((cell.SIZE-length)/2);
                var sourceY = Math.round((cell.SIZE-length)/2);
                var tempX = sourceX;
                var tempY = sourceY;
                drawCross(ctx, tempX, tempY, true, cell.SIZE, sourceX, sourceY);
            }
        }
    });
}
//Progressive cross drawing
function drawCross(ctx,tempX, tempY, forward, width, sourceX, sourceY){
    ctx.beginPath();
    ctx.save();
    ctx.lineWidth = Math.round(width/12);
    ctx.strokeStyle = "red";
    ctx.lineCap = "round";
    ctx.moveTo(tempX, tempY);
    if(forward){
        var x = tempX + 5;
    }else{
        var x = tempX - 5
    }
    var y = tempY + 5;
    ctx.lineTo(x,y);
    ctx.stroke();
    tempX = x;
    tempY = y;
    ctx.restore();
    ctx.closePath();
    if(forward){
        if(x < (width - sourceX)){
            setTimeout(function(){
                drawCross(ctx,tempX, tempY, forward, width, sourceX, sourceY)
            },10);
        }else{
            forward = false;
            tempX = width - sourceX;
            tempY = sourceY
        }
    }
    if(!forward){
        if(x > (sourceX)){
            setTimeout(function(){
                drawCross(ctx,tempX, tempY, forward, width, sourceX, sourceY)
            },10);
        }
    }
}
//Progressive circle drawing
function drawCircle(ctx, w, h, i){
    var coeff = Math.PI / 180;
    var radius = Math.round(w/6);
    var sourceX = Math.round(w/2 + radius * Math.cos(i * coeff))
    var sourceY = Math.round(h/2 + radius * Math.sin(i * coeff))
    i += 10;
    var x = Math.round(w/2 + radius * Math.cos(i * coeff));
    var y = Math.round(h/2 + radius * Math.sin(i * coeff));
    ctx.beginPath();
    ctx.save();
    ctx.lineWidth = Math.round(w/12);
    ctx.lineCap = "round";
    ctx.strokeStyle = "green";
    ctx.moveTo(sourceX, sourceY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
    ctx.closePath();
    if(i < 360){
        setTimeout(function(){
            drawCircle(ctx, w, h, i);
        }, 5);
    }
}
////////////////////
//Executions
///////////////////
buildMap();
updateOutput();
}