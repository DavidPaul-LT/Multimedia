// Declaraciones de Box2D
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
var b2ContactListener = Box2D.Dynamics.b2ContactListener;

// LOADER CORREGIDO - Versión que funciona con MP3 y OGG
var loader = {
    loaded: true,
    loadedCount: 0,
    totalCount: 0, 
    soundFileExtn: "",
    onload: null,

    init: function() {
        var mp3Support = false;
        var oggSupport = false;
        var audio = document.createElement("audio");
        
        if (audio.canPlayType) {
            mp3Support = "" !== audio.canPlayType("audio/mpeg");
            oggSupport = "" !== audio.canPlayType("audio/ogg; codecs=\"vorbis\"");
        }
        
        // Primero intenta con OGG, si no, con MP3
        if (oggSupport) {
            loader.soundFileExtn = ".ogg";
        } else if (mp3Support) {
            loader.soundFileExtn = ".mp3";
        } else {
            loader.soundFileExtn = undefined;
        }
        
        console.log("Audio format detected:", loader.soundFileExtn);
    },

    loadImage: function(url) {
        this.loaded = false;
        this.totalCount++;
        game.showScreen("loadingscreen");
        var image = new Image();
        image.addEventListener("load", loader.itemLoaded, false);
        image.src = url;
        return image;
    },

    loadSound: function(url) {
        this.loaded = false;
        this.totalCount++;
        game.showScreen("loadingscreen");

        // Si no hay soporte de audio, NO bloquees la carga
        if (!loader.soundFileExtn) {
            setTimeout(function(){ loader.itemLoaded(); }, 0);
            return null;
        }

        // Usar wAudio si existe, si no Audio normal
        var audio = new (window.wAudio || Audio)();

        // En file:// y algunos navegadores, canplaythrough puede no dispararse
        var done = false;
        function finish(ev){
            if (done) return;
            done = true;
            loader.itemLoaded(ev);
        }

        audio.addEventListener("canplaythrough", finish, false);
        audio.addEventListener("loadeddata", finish, false);
        audio.addEventListener("canplay", finish, false);
        audio.addEventListener("error", finish, false);
        audio.addEventListener("stalled", finish, false);

        audio.src = url + loader.soundFileExtn;

        // Fallback duro: si no dispara nada, no bloquees el juego
        setTimeout(finish, 1500);

        return audio;
        },

  itemLoaded: function(ev) {
    if (ev && ev.target && ev.type) {
      try { ev.target.removeEventListener(ev.type, loader.itemLoaded, false); } catch(e) {}
    }

    loader.loadedCount++;

    var loadingMsg = document.getElementById("loadingmessage");
    if (loadingMsg) {
      loadingMsg.innerHTML = "Loaded " + loader.loadedCount + " of " + loader.totalCount;
    }

    if (loader.loadedCount === loader.totalCount) {
      loader.loaded = true;

      // Resetea contadores para futuras cargas
      loader.loadedCount = 0;
      loader.totalCount = 0;

      // Oculta pantalla de carga
      if (game.hideScreen) game.hideScreen("loadingscreen");
      else {
        var ls = document.getElementById("loadingscreen");
        if (ls) ls.style.display = "none";
      }

      // Llama onload si existe
      if (loader.onload) {
        var onload = loader.onload;
        loader.onload = null;
        onload();
      }
    }
  }
  };

// MOUSE CORREGIDO
var mouse = {
    x: 0,
    y: 0,
    down: false,
    dragging: false,

    init: function() {
        var canvas = document.getElementById("gamecanvas");
        if (!canvas) return;

        // Ratón
        canvas.addEventListener("mousemove", mouse.mousemoveHandler, false);
        canvas.addEventListener("mousedown", mouse.mousedownHandler, false);
        canvas.addEventListener("mouseup", mouse.mouseupHandler, false);
        canvas.addEventListener("mouseout", mouse.mouseupHandler, false);

        // Táctil
        canvas.addEventListener("touchmove", mouse.touchmoveHandler, false);
        canvas.addEventListener("touchstart", mouse.touchstartHandler, false);
        canvas.addEventListener("touchend", mouse.mouseupHandler, false);
        canvas.addEventListener("touchcancel", mouse.mouseupHandler, false);
    },

    _updateFromClientXY: function(clientX, clientY) {
        var rect = game.canvas.getBoundingClientRect();
        mouse.x = (clientX - rect.left) / (game.scale || 1);
        mouse.y = (clientY - rect.top) / (game.scale || 1);
    },

    mousemoveHandler: function(ev) {
        mouse._updateFromClientXY(ev.clientX, ev.clientY);
        if (mouse.down) mouse.dragging = true;
        ev.preventDefault();
    },

    touchmoveHandler: function(ev) {
        if (ev.targetTouches && ev.targetTouches.length > 0) {
            var t = ev.targetTouches[0];
            mouse._updateFromClientXY(t.clientX, t.clientY);
            if (mouse.down) mouse.dragging = true;
        }
        ev.preventDefault();
    },

    _tryStartFiring: function() {
        if (!game.currentHero) return;
        if (game.mode !== "wait-for-firing") return;

        var heroData = game.currentHero.GetUserData();
        if (!heroData) return;

        // Posición del héroe en píxeles
        var hp = game.currentHero.GetPosition();
        var hx = hp.x * box2d.scale - game.offsetLeft;
        var hy = hp.y * box2d.scale;

        var r = (heroData.radius || 20) + 10; // margen
        var dx = mouse.x - hx;
        var dy = mouse.y - hy;

        var nearHero = (dx*dx + dy*dy) <= (r*r);
        var nearSling = Math.abs((mouse.x + game.offsetLeft) - game.slingshotBandX) < 120 && Math.abs(mouse.y - game.slingshotBandY) < 120;

        if (nearHero || nearSling) {
            game.mode = "firing";
        }
    },

    touchstartHandler: function(ev) {
        mouse.down = true;
        mouse.dragging = false;

        if (ev.targetTouches && ev.targetTouches.length > 0) {
            var t = ev.targetTouches[0];
            mouse._updateFromClientXY(t.clientX, t.clientY);
        }

        mouse._tryStartFiring();
        ev.preventDefault();
    },

    mousedownHandler: function(ev) {
        mouse.down = true;
        mouse.dragging = false;

        mouse._updateFromClientXY(ev.clientX, ev.clientY);
        mouse._tryStartFiring();

        ev.preventDefault();
    },

    mouseupHandler: function(ev) {
        mouse.down = false;
        mouse.dragging = false;

        if (ev) ev.preventDefault();
    }
};

// LEVELS (niveles del juego)
var levels = {
    data: [
        {
            background: "desert-sonic",
            entities: [
                { type: "ground", name: "dirt", x: 500, y: 440, width: 1000, height: 20, isStatic: true },
                { type: "ground", name: "wood", x: 190, y: 390, width: 30, height: 80, isStatic: true },
                { type: "block", name: "wood", x: 500, y: 380, angle: 90, width: 100, height: 25 },
                { type: "block", name: "glass", x: 500, y: 280, angle: 90, width: 100, height: 25 },
                { type: "villain", name: "egg", x: 500, y: 205, calories: 590 },
                { type: "block", name: "wood", x: 800, y: 380, angle: 90, width: 100, height: 25 },
                { type: "block", name: "glass", x: 800, y: 280, angle: 90, width: 100, height: 25 },
                { type: "villain", name: "metal", x: 800, y: 205, calories: 420 },
                { type: "hero", name: "sonic", x: 80, y: 405 },
                { type: "hero", name: "rojo", x: 200, y: 405 },
            ]
        },
        {
            background: "desert-sonic",
            entities: [
                { type: "ground", name: "dirt", x: 500, y: 440, width: 1000, height: 20, isStatic: true },
                { type: "ground", name: "wood", x: 190, y: 390, width: 30, height: 80, isStatic: true },
                { type: "block", name: "wood", x: 620, y: 380, angle: 0, width: 10, height: 25 },
                { type: "block", name: "wood", x: 680, y: 380, angle: 0, width: 10, height: 25 },
                { type: "block", name: "wood", x: 650, y: 320, angle: 0, width: 120, height: 5 },
                

                { type: "villain", name: "metal", x: 650, y: 320, calories: 420 },

                { type: "block", name: "wood", x: 800, y: 380, angle: 90, width: 100, height: 25 },
                { type: "villain", name: "egg", x: 800, y: 250, calories: 590 },

                { type: "hero", name: "amarillo", x: 260, y: 405 },
                { type: "hero", name: "amy", x: 140, y: 405 },

                
            ]
        },
    {
        background: "desert-sonic",
        entities: [
          // Suelo
          { type: "ground", name: "dirt", x: 500, y: 440, width: 1000, height: 20, isStatic: true },
          { type: "ground", name: "wood", x: 190, y: 390, width: 30, height: 80, isStatic: true },
          // Plataformas principales para sostener estructuras
          { type: "ground", name: "wood", x: 350, y: 420, width: 150, height: 20},
          // Cubo izquierdo: paredes y techo
          { type: "block", name: "wood", x: 320, y: 380, width: 20, height: 80 }, // pared izquierda
          { type: "block", name: "wood", x: 380, y: 380, width: 20, height: 80 }, // pared derecha
          { type: "block", name: "wood", x: 350, y: 340, width: 80, height: 20 }, // techo

          // Villano dentro del cubo izquierdo
          { type: "villain", name: "metal", x: 350, y: 370, calories: 420 },

          // Cubo derecho: paredes y techo
          { type: "block", name: "wood", x: 670, y: 380, width: 5, height: 80 }, // pared izquierda
          { type: "block", name: "wood", x: 730, y: 380, width: 5, height: 80 }, // pared derecha
          { type: "block", name: "wood", x: 700, y: 340, width: 80, height: 10 }, // techo

          // Villano dentro del cubo derecho
          { type: "villain", name: "metal", x: 700, y: 380, calories: 420 },

          // Puerta central reforzada con villano principal
          { type: "villain", name: "egg", x: 500, y: 320, calories: 590 },

          // Héroes 
          { type: "hero", name: "sonic", x: 80, y: 405 },
          { type: "hero", name: "amy", x: 140, y: 405 },
          { type: "hero", name: "rojo", x: 200, y: 405 },
          { type: "hero", name: "amarillo", x: 260, y: 405 }
        ]
    }
    ],

    init: function() {
        var levelSelectScreen = document.getElementById("levelselectscreen");
        if (!levelSelectScreen) return;

        var levelButtons = document.getElementById("levelButtons");
        if (!levelButtons) {
            // fallback por si no existe (evita romper)
            levelButtons = levelSelectScreen;
        }

        levelButtons.innerHTML = "";

        for (var i = 0; i < this.data.length; i++) {
            var input = document.createElement("input");
            input.type = "button";
            input.value = (i + 1).toString();
            input.onclick = (function(index) {
            return function() {
                levels.load(index);
            };
            })(i);
            levelButtons.appendChild(input);
        }

        if (!game.difficulty) game.setDifficulty("normal");
    },

    load: function(number) {
        box2d.init();
        
        game.currentLevel = { number: number, heroes: [] };
        game.score = 0;
        
        var scoreElement = document.getElementById("score");
        if (scoreElement) {
            scoreElement.innerHTML = "Score: " + game.score;
        }

        var level = levels.data[number];

        game.currentLevel.backgroundImage = loader.loadImage("images/backgrounds/" + level.background + ".png");
        game.slingshotImage = loader.loadImage("images/slingshot.png");
        game.slingshotFrontImage = loader.loadImage("images/slingshot-front.png");

        for (var i = 0; i < level.entities.length; i++) {
            var entity = level.entities[i];
            entities.create(entity);
        }

        // Arrancar el juego cuando terminen de cargar TODOS los assets
        loader.onload = game.start;
        // Por si todo viene de caché y el loader ya estaba en estado loaded
        if (loader.loaded) {
            game.start();
        }
    }
};

// ENTITIES (definiciones de objetos del juego)
var entities = {
    definitions: {
        "glass": { fullHealth: 100, density: 2.4, friction: 0.4, restitution: 0.15 },
        "wood": { fullHealth: 500, density: 0.7, friction: 0.4, restitution: 0.4 },
        "dirt": { density: 3.0, friction: 1.5, restitution: 0.2 },
        "sonic": { shape: "circle", fullHealth: 4000, radius: 22, density: 1, friction: 0.5, restitution: 0.4 },
        "amy": { shape: "circle", fullHealth: 4000, radius: 22, density: 1, friction: 0.5, restitution: 0.4 },
        "rojo": { shape: "circle", fullHealth: 4000, radius: 22, density: 1, friction: 0.5, restitution: 0.4 },
        "amarillo": { shape: "circle", fullHealth: 4000, radius: 22, density: 1, friction: 0.5, restitution: 0.4 },
        "egg": { shape: "circle", fullHealth: 30, radius: 22, density: 1, friction: 0.5, restitution: 0.4 },
        "metal": { shape: "circle", fullHealth: 15, radius: 22, density: 1, friction: 0.5, restitution: 0.4 },
        
    },

    create: function(entity) {
        var definition = entities.definitions[entity.name];
        if (!definition) {
            console.log("Undefined entity name", entity.name);
            return;
        }

        switch(entity.type) {
            case "block":
                var hf = (game && game.difficultyHealthFactor) ? game.difficultyHealthFactor : 1.0;
                entity.health = (definition.fullHealth || 0) * hf;
                entity.fullHealth = (definition.fullHealth || 0) * hf;
                entity.shape = "rectangle";
                entity.sprite = loader.loadImage("images/entities/" + entity.name + ".png");
                box2d.createRectangle(entity, definition);
                break;
            case "ground":
                entity.shape = "rectangle";
                box2d.createRectangle(entity, definition);
                break;
            case "hero":
            case "villain":
                var hf = (game && game.difficultyHealthFactor) ? game.difficultyHealthFactor : 1.0;
                entity.health = (definition.fullHealth || 0) * hf;
                entity.fullHealth = (definition.fullHealth || 0) * hf;
                entity.sprite = loader.loadImage("images/entities/" + entity.name + ".png");
                entity.shape = definition.shape;
                if (definition.shape === "circle") {
                    entity.radius = definition.radius;
                    box2d.createCircle(entity, definition);
                }
                break;
            default:
                console.log("Undefined entity type", entity.type);
                break;
        }
    },

    draw: function(entity, position, angle) {
        game.context.save();
        game.context.translate(position.x * box2d.scale - game.offsetLeft, position.y * box2d.scale);
        game.context.rotate(angle);
        var padding = 1;

        switch (entity.type) {
            case "block":
                game.context.drawImage(entity.sprite, 0, 0, entity.sprite.width, entity.sprite.height,
                    -entity.width/2 - padding, -entity.height/2 - padding,
                    entity.width + 2*padding, entity.height + 2*padding);
                break;
            case "villain":
            case "hero":
                if (entity.shape == "circle") {
                    game.context.drawImage(entity.sprite, 0, 0, entity.sprite.width, entity.sprite.height,
                        -entity.radius - padding, -entity.radius - padding,
                        entity.radius*2 + 2*padding, entity.radius*2 + 2*padding);
                }
                break;
        }
        game.context.restore();
    }
};

// BOX2D (motor de física)
var box2d = {
    scale: 30,
    world: null,

    init: function() {
        var gravity = new b2Vec2(0, 9.8);
        var allowSleep = true;
        box2d.world = new b2World(gravity, allowSleep);
        this.handleCollisions();
    },

    createRectangle: function(entity, definition) {
        var bodyDef = new b2BodyDef();
        bodyDef.type = entity.isStatic ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;
        bodyDef.position.x = entity.x / box2d.scale;
        bodyDef.position.y = entity.y / box2d.scale;
        if (entity.angle) {
            bodyDef.angle = Math.PI * entity.angle / 180;
        }

        var fixtureDef = new b2FixtureDef();
        fixtureDef.density = definition.density;
        fixtureDef.friction = definition.friction;
        fixtureDef.restitution = definition.restitution;
        fixtureDef.shape = new b2PolygonShape();
        fixtureDef.shape.SetAsBox(entity.width / 2 / box2d.scale, entity.height / 2 / box2d.scale);

        var body = box2d.world.CreateBody(bodyDef);
        body.SetUserData(entity);
        body.CreateFixture(fixtureDef);
        return body;
    },

    createCircle: function(entity, definition) {
        var bodyDef = new b2BodyDef();
        bodyDef.type = entity.isStatic ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;
        bodyDef.position.x = entity.x / box2d.scale;
        bodyDef.position.y = entity.y / box2d.scale;
        if (entity.angle) {
            bodyDef.angle = Math.PI * entity.angle / 180;
        }

        var fixtureDef = new b2FixtureDef();
        fixtureDef.density = definition.density;
        fixtureDef.friction = definition.friction;
        fixtureDef.restitution = definition.restitution;
        fixtureDef.shape = new b2CircleShape(entity.radius / box2d.scale);

        var body = box2d.world.CreateBody(bodyDef);
        body.SetUserData(entity);
        body.CreateFixture(fixtureDef);
        return body;
    },

    step: function(timeStep) {
        if (timeStep > 1 / 30) {
            timeStep = 1 / 30;
        }
        box2d.world.Step(timeStep, 8, 3);
        box2d.world.ClearForces();
    },

    handleCollisions: function() {
        var listener = new b2ContactListener();
        listener.PostSolve = function(contact, impulse) {
            var body1 = contact.GetFixtureA().GetBody();
            var body2 = contact.GetFixtureB().GetBody();
            var entity1 = body1.GetUserData();
            var entity2 = body2.GetUserData();
            var impulseAlongNormal = Math.abs(impulse.normalImpulses[0]);

            if (impulseAlongNormal > 5) {
                if (entity1 && entity1.health) {
                    entity1.health -= impulseAlongNormal;
                }
                if (entity2 && entity2.health) {
                    entity2.health -= impulseAlongNormal;
                }
            }
        };
        box2d.world.SetContactListener(listener);
    }
};

// GAME (objeto principal del juego)
var game = {
  musicMuted: false,
  canvas: null,
  context: null,
  scale: 1,
  mode: "intro",
  slingshotX: 140,
  slingshotY: 280,
  slingshotBandX: 140 + 55,
  slingshotBandY: 280 + 23,
  ended: false,
  score: 0,
  offsetLeft: 0,
  maxSpeed: 3,
  heroes: [],
  villains: [],
  currentLevel: null,
  currentHero: null,
  lastUpdateTime: undefined,
  animationFrame: undefined,
  backgroundMusic: null,
  slingshotReleasedSound: null,
  bounceSound: null,
  breakSound: null,

  difficulty: "normal",
  impulseScaleFactor: 0.5,
  wind: 1.5,
  heroDamping: 1.5,
  difficultyHealthFactor: 1.0,

  setDifficulty: function (level) {
    game.difficulty = level;

    if (level === "easy") {
      game.impulseScaleFactor = 0.7;
      game.wind = 0.0;
      game.heroDamping = 0;
      game.difficultyHealthFactor = 1;
    }

    if (level === "normal") {
      game.impulseScaleFactor = 0.7;
      game.wind = 1.5;
      game.heroDamping = 1.5;
      game.difficultyHealthFactor = 1.5;
    }

    if (level === "hard") {
      game.impulseScaleFactor = 0.9;
      game.wind = 3.0;
      game.heroDamping = 1.75;
      game.difficultyHealthFactor = 2.5;
    }

    var d = document.getElementById("difficultyLabel");
        if (d) {
    d.textContent = level.toUpperCase();
    d.classList.remove("difficulty-easy","difficulty-normal","difficulty-hard");
    d.classList.add("difficulty-" + level);
    }

    var d = document.getElementById("difficultyLabel");
    console.log("Difficulty:", level, {
      impulse: game.impulseScaleFactor,
      wind: game.wind,
      damping: game.heroDamping,
      healthFactor: game.difficultyHealthFactor
    });
  },

  paused: false,

  togglePause: function () {
    game.paused = !game.paused;

    var btn = document.getElementById("pausebtn");
    if (btn) btn.innerHTML = game.paused ? "&#9658;" : "&#10074;&#10074;";

    if (game.paused) {
      if (game.animationFrame) window.cancelAnimationFrame(game.animationFrame);
      if (game.backgroundMusic && !game.backgroundMusic.paused) game.backgroundMusic.pause();
    } else {
      game.lastUpdateTime = undefined; // evita salto de física
      game.animationFrame = window.requestAnimationFrame(game.animate);
      if (!game.musicMuted && game.backgroundMusic && game.backgroundMusic.paused) {
        var p = game.backgroundMusic.play();
        if (p && p.catch) p.catch(function () {});
      }
    }
  },

  init: function () {
    game.canvas = document.getElementById("gamecanvas");
    if (!game.canvas) {
      console.error("Canvas not found!");
      return;
    }

    game.context = game.canvas.getContext("2d");

    // inicializaciones base
    levels.init();
    loader.init();
    mouse.init();

    // carga sonidos y muestra start
    game.loadSounds(function () {
      game.hideScreens();
      game.showScreen("gamestartscreen");
    });
  },

  loadSounds: function (onload) {
    game.backgroundMusic = loader.loadSound("audio/Sonic");
    game.slingshotReleasedSound = loader.loadSound("audio/released");
    game.bounceSound = loader.loadSound("audio/bounce");
    game.breakSound = {
      glass: loader.loadSound("audio/glassbreak"),
      wood: loader.loadSound("audio/woodbreak")
    };
    loader.onload = onload;
  },

  startBackgroundMusic: function () {
    if (game.backgroundMusic) {
      var p = game.backgroundMusic.play();
      if (p && p.catch) p.catch(function () {});
      game.setBackgroundMusicButton();
    }
  },

  stopBackgroundMusic: function () {
    if (game.backgroundMusic) {
      game.backgroundMusic.pause();
      game.backgroundMusic.currentTime = 0;
      game.setBackgroundMusicButton();
    }
  },

  toggleBackgroundMusic: function () {

  if (!game.backgroundMusic) return;

  game.musicMuted = !game.musicMuted;

  if (game.musicMuted) {
    game.backgroundMusic.pause();
  } else {
    var p = game.backgroundMusic.play();
    if (p && p.catch) p.catch(function(){});
  }

  game.setBackgroundMusicButton();
},

    setBackgroundMusicButton: function () {
  var btn = document.getElementById("togglemusic");

  if (!btn) return;

  if (game.backgroundMusic && game.backgroundMusic.paused) {
    btn.classList.remove("sound-on");
    btn.classList.add("sound-off");
  } else {
    btn.classList.remove("sound-off");
    btn.classList.add("sound-on");
  }
},

  hideScreens: function () {
    var screens = document.getElementsByClassName("gamelayer");
    for (var i = screens.length - 1; i >= 0; i--) {
      screens[i].style.display = "none";
    }
  },

  hideScreen: function (id) {
    var screen = document.getElementById(id);
    if (screen) screen.style.display = "none";
  },

  showScreen: function (id) {
    var screen = document.getElementById(id);
    if (screen) screen.style.display = "block";
  },

  showLevelScreen: function () {
    game.hideScreens();
    game.showScreen("levelselectscreen");
  },

  restartLevel: function () {
    if (game.animationFrame) window.cancelAnimationFrame(game.animationFrame);
    game.lastUpdateTime = undefined;
    levels.load(game.currentLevel.number);
  },

  startNextLevel: function () {
    if (game.animationFrame) window.cancelAnimationFrame(game.animationFrame);
    game.lastUpdateTime = undefined;
    levels.load(game.currentLevel.number + 1);
  },

  showEndingScreen: function () {
    var playNextLevel = document.getElementById("playnextlevel");
    var endingMessage = document.getElementById("endingmessage");
    
    if (game.mode === "level-success") {
      
      if (game.currentLevel.number < levels.data.length - 1) {
        endingMessage.innerHTML = "Level Complete. Well Done!!!";
        playNextLevel.style.display = "block";
      } else {
        endingMessage.innerHTML = "All Levels Complete. Well Done!!!";
        playNextLevel.style.display = "none";
      }
    } else if (game.mode === "level-failure") {
      endingMessage.innerHTML = "Failed. Play Again?";
      playNextLevel.style.display = "none";
    }
    game.showScreen("endingscreen");
    game.stopBackgroundMusic();
  },

  start: function () {
    game.hideScreens();
    game.showScreen("gamecanvas");
    game.showScreen("scorescreen");

    game.mode = "intro";
    game.currentHero = undefined;
    game.offsetLeft = 0;
    game.ended = false;

    if (game.animationFrame) window.cancelAnimationFrame(game.animationFrame);
    game.animationFrame = window.requestAnimationFrame(game.animate);

    game.startBackgroundMusic();
  },

  panTo: function (newCenter) {
    var minOffset = 0;
    var maxOffset = game.currentLevel.backgroundImage.width - game.canvas.width;
    var currentCenter = game.offsetLeft + game.canvas.width / 2;

    if (Math.abs(newCenter - currentCenter) > 0 && game.offsetLeft <= maxOffset && game.offsetLeft >= minOffset) {
      var deltaX = (newCenter - currentCenter) / 2;
      if (Math.abs(deltaX) > game.maxSpeed) deltaX = game.maxSpeed * Math.sign(deltaX);
      if (Math.abs(deltaX) <= 1) deltaX = (newCenter - currentCenter);

      game.offsetLeft += deltaX;
      if (game.offsetLeft <= minOffset) { game.offsetLeft = minOffset; return true; }
      if (game.offsetLeft >= maxOffset) { game.offsetLeft = maxOffset; return true; }
      return false;
    }
    return true;
  },

  handleGameLogic: function () {
    if (game.mode == "intro") {
      if (game.panTo(700)) game.mode = "load-next-hero";
    }

    if (game.mode == "wait-for-firing") {
      if (mouse.dragging) game.panTo(mouse.x + game.offsetLeft);
      else game.panTo(game.slingshotX);
    }

    if (game.mode == "load-next-hero") {
      game.countHeroesAndVillains();

      if (game.villains.length == 0) { game.mode = "level-success"; return; }
      if (game.heroes.length == 0) { game.mode = "level-failure"; return; }

      if (!game.currentHero) {
        game.currentHero = game.heroes[game.heroes.length - 1];

        var heroStartX = game.slingshotX + 20;
        var heroStartY = game.slingshotY + 20;

        game.currentHero.SetPosition({ x: heroStartX / box2d.scale, y: heroStartY / box2d.scale });
        game.currentHero.SetLinearVelocity({ x: 0, y: 0 });
        game.currentHero.SetAngularVelocity(0);
        game.currentHero.SetAwake(true);
      } else {
        game.panTo(game.slingshotX);

        var v = game.currentHero.GetLinearVelocity();
        var speed = Math.sqrt(v.x*v.x + v.y*v.y);

        if (speed < 0.15) {
            game.currentHero.SetAwake(false); 
            game.mode = "wait-for-firing";
            }
    }
}

    if (game.mode == "firing") {
      if (mouse.down) {
        game.panTo(game.slingshotX);

        var distance = Math.sqrt(
          Math.pow(mouse.x - game.slingshotBandX + game.offsetLeft, 2) +
          Math.pow(mouse.y - game.slingshotBandY, 2)
        );

        var angle = Math.atan2(mouse.y - game.slingshotBandY, mouse.x - game.slingshotBandX);
        var minDragDistance = 10;
        var maxDragDistance = 120;
        var maxAngle = Math.PI * 145 / 180;

        if (angle > 0 && angle < maxAngle) angle = maxAngle;
        if (angle < 0 && angle > -maxAngle) angle = -maxAngle;
        if (distance > maxDragDistance) distance = maxDragDistance;
        if ((mouse.x + game.offsetLeft > game.slingshotBandX)) { distance = minDragDistance; angle = Math.PI; }

        game.currentHero.SetPosition({
          x: (game.slingshotBandX + distance * Math.cos(angle) + game.offsetLeft) / box2d.scale,
          y: (game.slingshotBandY + distance * Math.sin(angle)) / box2d.scale
        });
      } else {
        game.mode = "fired";

        var impulseScaleFactor = game.impulseScaleFactor;
        var hp = game.currentHero.GetPosition();
        var heroPositionX = hp.x * box2d.scale;
        var heroPositionY = hp.y * box2d.scale;

        var impulse = new b2Vec2(
          (game.slingshotBandX - heroPositionX) * impulseScaleFactor,
          (game.slingshotBandY - heroPositionY) * impulseScaleFactor
        );

        game.currentHero.ApplyImpulse(impulse, game.currentHero.GetWorldCenter());

        var d = game.heroDamping || 1.8;
        game.currentHero.SetLinearDamping(d);
        game.currentHero.SetAngularDamping(d + 0.5);

        if (game.slingshotReleasedSound) {
          try { game.slingshotReleasedSound.currentTime = 0; } catch(e) {}
          var p = game.slingshotReleasedSound.play();
          if (p && p.catch) p.catch(function(){});
        }
      }
    }

    if (game.mode == "fired") {
      var heroX = game.currentHero.GetPosition().x * box2d.scale;
      game.panTo(heroX);
      if ( !game.currentHero.IsAwake() || heroX < 0 || heroX > game.currentLevel.backgroundImage.width) {
        box2d.world.DestroyBody(game.currentHero);
        game.currentHero = undefined;
        game.mode = "load-next-hero";
      }
    }

    if (game.mode === "level-success" || game.mode === "level-failure") {
      if (game.panTo(0)) {
        game.ended = true;
        game.showEndingScreen();
      }
    }
  },

  countHeroesAndVillains: function () {
    game.heroes = [];
    game.villains = [];
    if (!box2d.world) return;

    for (var body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
      var entity = body.GetUserData();
      if (entity) {
        if (entity.type === "hero") game.heroes.push(body);
        else if (entity.type === "villain") game.villains.push(body);
      }
    }
  },

  removeDeadBodies: function () {
    if (!box2d.world) return;

    for (var body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
      var entity = body.GetUserData();
      if (entity) {
        var entityX = body.GetPosition().x * box2d.scale;
        if (
          entityX < 0 || entityX > game.currentLevel.backgroundImage.width ||
          (entity.health !== undefined && entity.health <= 0)
        ) {
          box2d.world.DestroyBody(body);

          if (entity.type == "villain" && entity.calories) {
            game.score += entity.calories;
            var scoreElement = document.getElementById("score");
            if (scoreElement) scoreElement.innerHTML = "Score: " + game.score;
          }
        }
      }
    }
  },

  drawAllBodies: function () {
    if (!box2d.world) return;

    for (var body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
      var entity = body.GetUserData();
      if (entity && entity.sprite) {
        entities.draw(entity, body.GetPosition(), body.GetAngle());
      }
    }
  },

  animate: function () {
    try {
      if (game.paused) return;

      var currentTime = new Date().getTime();
      if (game.lastUpdateTime) {
        var timeStep = (currentTime - game.lastUpdateTime) / 1000;
        box2d.step(timeStep);

        if (game.mode === "fired" && game.currentHero && game.wind) {
            var v = game.currentHero.GetLinearVelocity();
            var speed = Math.sqrt(v.x*v.x + v.y*v.y);

            // solo viento mientras aún “vuela”
            if (speed > 0.2) {
                game.currentHero.ApplyForce(new b2Vec2(game.wind, 0), game.currentHero.GetWorldCenter());
            } else {
                game.currentHero.SetAwake(false);
            }
        }
      }
      game.lastUpdateTime = currentTime;

      game.handleGameLogic();
      game.removeDeadBodies();

      if (game.currentLevel && game.currentLevel.backgroundImage) {

        game.context.drawImage(
          game.currentLevel.backgroundImage,
          game.offsetLeft, 0,
          game.canvas.width,
          game.canvas.height,
          0,
          0,
          game.canvas.width,
          game.canvas.height
        );
      }

      if (game.slingshotImage) {
        game.context.drawImage(game.slingshotImage, game.slingshotX - game.offsetLeft, game.slingshotY);
      }

      game.drawAllBodies();

      if (game.mode == "firing" && game.currentHero) {
        game.drawSlingshotBand();
      }

      if (game.slingshotFrontImage) {
        game.context.drawImage(game.slingshotFrontImage, game.slingshotX - game.offsetLeft, game.slingshotY);
      }

      if (!game.ended) {
        game.animationFrame = window.requestAnimationFrame(game.animate);
      }
    } catch (e) {
      console.error("Error in animation loop:", e);
    }
  },

  drawSlingshotBand: function () {
    if (!game.currentHero) return;

    game.context.strokeStyle = "rgb(68,31,11)";
    game.context.lineWidth = 7;

    var heroData = game.currentHero.GetUserData();
    if (!heroData) return;

    var radius = heroData.radius + 1;
    var heroX = game.currentHero.GetPosition().x * box2d.scale;
    var heroY = game.currentHero.GetPosition().y * box2d.scale;

    var angle = Math.atan2(game.slingshotBandY - heroY, game.slingshotBandX - heroX);
    var heroFarEdgeX = heroX - radius * Math.cos(angle);
    var heroFarEdgeY = heroY - radius * Math.sin(angle);

    game.context.beginPath();
    game.context.moveTo(game.slingshotBandX - game.offsetLeft, game.slingshotBandY);
    game.context.lineTo(heroX - game.offsetLeft, heroY);
    game.context.stroke();

    entities.draw(heroData, game.currentHero.GetPosition(), game.currentHero.GetAngle());

    game.context.beginPath();
    game.context.moveTo(heroFarEdgeX - game.offsetLeft, heroFarEdgeY);
    game.context.lineTo(game.slingshotBandX - game.offsetLeft - 40, game.slingshotBandY + 15);
    game.context.stroke();
  },

  playGame: function () {
    if (window.wAudio) window.wAudio.playMutedSound();
    game.showLevelScreen();
  },

  resize: function () {
    var maxWidth = window.innerWidth;
    var maxHeight = window.innerHeight;

    game.scale = Math.min(maxWidth / 640, maxHeight / 480);

    var gameContainer = document.getElementById("gamecontainer");
    if (gameContainer) {
      gameContainer.style.transform = "translate(-50%, -50%) scale(" + game.scale + ")";
    }

    var width = Math.max(640, Math.min(1024, maxWidth / game.scale));
    if (gameContainer) gameContainer.style.width = width + "px";
    if (game.canvas) game.canvas.width = width;
  }
};

// Inicialización
window.addEventListener("load", function() {
    game.resize();
    game.init();
});

window.addEventListener("resize", function() {
    game.resize();
});

document.addEventListener("touchmove", function(ev) {
    ev.preventDefault();
}, { passive: false });