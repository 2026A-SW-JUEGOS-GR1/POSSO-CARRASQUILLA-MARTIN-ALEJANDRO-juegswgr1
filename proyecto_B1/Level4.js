class Level4 extends Phaser.Scene {
    constructor() {
        super({ key: 'Level4' });
        this.score = 0;
        this.lives = 3;
        this.keys = 0; // Llaves del Rey
        this.isPaused = false;
        
        // Estado de los bloques mágicos
        this.redSolid = true; // Rojo (59) empieza sólido
        this.isRespawning = false; // Para evitar perder múltiples vidas a la vez en el ácido
    }

    preload() {
        // Carga de assets del Escenario 4
        // Asumo que tu JSON usa tiles-castle.png según los datos
        this.load.image('fondo_medieval', 'assets/castillo.png'); 
        this.load.image('tiles_castillo', 'assets/tiles-castle.png'); 
        this.load.tilemapTiledJSON('mapa_medieval', 'mapa_medieval.json'); 
        
        this.load.spritesheet('drago', 'assets/drago.png', { frameWidth: 100, frameHeight: 99 });
    }

    create() {
        this.isPaused = false;
        this.physics.resume();
        this.score = 0;
        this.lives = 3;
        this.keys = 0;
        this.redSolid = true;
        this.isRespawning = false;

        this.fondoCastillo = this.add.image(0, 0, 'fondo_medieval').setOrigin(0, 0);

        // 1. CREACIÓN DEL MAPA
        const map = this.make.tilemap({ key: 'mapa_medieval' });
        const tileset = map.addTilesetImage('tiles-castle', 'tiles_castillo');
        
        // Creamos la capa
        this.capaPlataformas = map.createLayer('platforms', tileset, 0, 0);

        // ==========================================
        // SISTEMA DE COLISIONES SELECTIVAS
        // ==========================================
        // Excluimos el vacío (-1) y TODOS los tiles interactivos que Drago debe poder atravesar
        // 8: Aire, 15: Ácido, 58: Azul (no sólido por defecto), 60/61: Antorchas, 
        // 66: Palanca, 75/83: Puerta, 86: Portales, 91: Llaves
        const noCollisionTiles = [-1, 8, 15, 58, 60, 61, 66, 75, 83, 86, 91];
        this.capaPlataformas.setCollisionByExclusion(noCollisionTiles);

        // Efecto visual inicial para los bloques azules (58) para que se vean fantasmales
        this.setTileAlpha(58, 0.3);

        // 2. CREACIÓN DE DRAGO (Escalado para ajustarse a los tiles de 16x16)
        this.player = this.physics.add.sprite(32, 64, 'drago');
        this.player.setScale(0.25); // Lo hacemos un 75% más pequeño
        this.player.body.setSize(40, 80); // Ajustamos la caja de colisión a su nueva escala
        this.player.body.setOffset(30, 10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.capaPlataformas);

        // Animaciones
        if (!this.anims.exists('walk')) {
            this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('drago', { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'idle', frames: [{ key: 'drago', frame: 0 }], frameRate: 10 });
        }
        this.player.play('idle');

        // ==========================================
        // REGISTRO DE PORTALES MAGICOS (Tile 86)
        // ==========================================
        this.portals = [];
        this.capaPlataformas.forEachTile(tile => {
            if (tile.index === 86) {
                this.portals.push(tile);
            }
        });

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();
        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E); // Tecla de interacción
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // UI
        this.nadiaText = this.add.text(10, 10, '[Nadia]: Busca las 3 llaves y cuidado con el ácido.', { fontSize: '18px', fill: '#0ff', fontStyle: 'italic' }).setScrollFactor(0);
        this.scoreText = this.add.text(10, 35, 'Puntos: 0', { fontSize: '18px', fill: '#fff' }).setScrollFactor(0);
        this.livesText = this.add.text(10, 60, 'Vidas: 3', { fontSize: '18px', fill: '#ff0000' }).setScrollFactor(0);
        this.keysText = this.add.text(10, 85, 'Llaves: 0/3', { fontSize: '18px', fill: '#ffd700' }).setScrollFactor(0);

        // Cámara
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setZoom(2.5); 
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Le decimos a la cámara principal que IGNORE los textos (para que no los amplíe)
        this.cameras.main.ignore([this.nadiaText, this.scoreText, this.livesText, this.keysText]);

        // 2. Cámara de Interfaz: Estática, sin zoom. (Ajusta 800 y 600 si tu juego es de otro tamaño)
        this.uiCamera = this.cameras.add(0, 0, 800, 600); 
        
        // Le decimos a esta cámara UI que IGNORE el mapa y al jugador, solo queremos que renderice los textos
        this.uiCamera.ignore([this.fondoCastillo, this.capaPlataformas, this.player]);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }

        if (this.isPaused || this.isRespawning) return;

        // ==========================================
        // LÓGICA DE ESCÁNER DE TILES (Ácido, Aire, Llaves, etc.)
        // ==========================================
        let bounds = this.player.getBounds();
        // Obtenemos todos los tiles que la caja de colisión de Drago está tocando
        let touchingTiles = this.capaPlataformas.getTilesWithinWorldXY(bounds.x, bounds.y, bounds.width, bounds.height);
        
        let touchingUpdraft = false;

        touchingTiles.forEach(tile => {
            if (!tile || tile.index === -1) return;

            // Foso de Ácido (15)
            if (tile.index === 15) {
                this.loseLife();
            }
            // Antorchas Apagadas (60)
            else if (tile.index === 60) {
                this.capaPlataformas.putTileAt(61, tile.x, tile.y); // Reemplazamos a Encendida
                this.score += 200;
                this.scoreText.setText('Puntos: ' + this.score);
                this.nadiaText.setText('[Nadia]: Antorcha encendida. Buen trabajo.');
            }
            // Llaves (91)
            else if (tile.index === 91) {
                this.capaPlataformas.removeTileAt(tile.x, tile.y);
                this.keys++;
                this.keysText.setText('Llaves: ' + this.keys + '/3');
                if (this.keys === 3) this.nadiaText.setText('[Nadia]: ¡Tienes todas las llaves! Ve al portón.');
            }
            // Portón de Salida (75 o 83)
            else if ((tile.index === 75 || tile.index === 83) && this.keys >= 3) {
                this.levelClear();
            }
            // Corriente de Aire (8)
            else if (tile.index === 8) {
                touchingUpdraft = true;
            }
        });

        // Aplicar mecánica de Viento
        if (touchingUpdraft) {
            this.player.setVelocityY(-150); // Lo hace flotar suavemente hacia arriba
            this.player.setTint(0xccffff);
        } else {
            this.player.clearTint();
        }

        // ==========================================
        // INTERACCIÓN CON LA TECLA 'E' (Portales y Palancas)
        // ==========================================
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            // Buscamos si hay un objeto interactivo justo en el centro del jugador
            let centerTile = this.capaPlataformas.getTileAtWorldXY(this.player.x, this.player.y);

            if (centerTile) {
                // Portal (86)
                if (centerTile.index === 86) {
                    this.teleportPlayer(centerTile);
                }
                // Palanca (66)
                else if (centerTile.index === 66) {
                    this.toggleMagicBlocks();
                }
            }
        }

        // MOVIMIENTO BÁSICO
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-120);
            this.player.anims.play('walk', true);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(120);
            this.player.anims.play('walk', true);
            this.player.flipX = false;
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('idle', true);
        }

        if (this.cursors.up.isDown && this.player.body.onFloor()) {
            this.player.setVelocityY(-250); // Salto reducido acorde a la escala del mapa
        }

        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) this.togglePause();
    }

    // --- Funciones Propias del Escenario ---

    teleportPlayer(currentPortal) {
        // Busca el primer portal en la lista que NO sea el que estamos tocando
        let destination = this.portals.find(p => p.x !== currentPortal.x || p.y !== currentPortal.y);
        
        if (destination) {
            // Animación de teletransporte
            this.nadiaText.setText('[Nadia]: ¡Firma espacio-temporal alterada!');
            this.player.setAlpha(0); // Lo hacemos invisible
            this.physics.pause();
            
            this.time.delayedCall(300, () => {
                // Lo movemos sumando 8 píxeles para centrarlo en el tile de 16x16
                this.player.setPosition(destination.pixelX + 8, destination.pixelY + 8);
                this.player.setAlpha(1);
                this.physics.resume();
            });
        }
    }

    toggleMagicBlocks() {
        this.redSolid = !this.redSolid;
        this.nadiaText.setText('[Nadia]: Mecanismo mágico activado.');

        if (this.redSolid) {
            // Rojos sólidos, Azules transparentes
            this.capaPlataformas.setCollision(59, true);
            this.capaPlataformas.setCollision(58, false);
            this.setTileAlpha(59, 1);
            this.setTileAlpha(58, 0.3);
        } else {
            // Azules sólidos, Rojos transparentes
            this.capaPlataformas.setCollision(59, false);
            this.capaPlataformas.setCollision(58, true);
            this.setTileAlpha(59, 0.3);
            this.setTileAlpha(58, 1);
        }
    }

    setTileAlpha(index, alpha) {
        this.capaPlataformas.forEachTile(tile => {
            if (tile.index === index) tile.alpha = alpha;
        });
    }

    loseLife() {
        // ¡LA SOLUCIÓN AL ÁCIDO!
        // Si Drago ya está en proceso de reaparecer, ignoramos el daño extra
        if (this.isRespawning) return; 

        this.isRespawning = true;
        this.lives--;
        this.livesText.setText('Vidas: ' + this.lives);
        
        if (this.lives <= 0) {
            let goText = this.add.text(400, 300, 'GAME OVER', { fontSize: '32px', fill: '#f00', backgroundColor: '#000' }).setOrigin(0.5).setScrollFactor(0);
            this.cameras.main.ignore(goText); // Evitamos que la cámara principal le haga zoom
            this.physics.pause();
            
            setTimeout(() => { this.scene.start('MainMenu'); }, 3000);
        } else {
            this.nadiaText.setText('[Nadia]: ¡Drago! Rebobinando tiempo...');
            this.player.setPosition(32, 64); // Coordenadas iniciales
            this.player.setVelocity(0, 0);
            
            // Periodo de invulnerabilidad de 1 segundo
            this.time.delayedCall(1000, () => { this.isRespawning = false; });
        }
    }

    levelClear() {
        this.physics.pause();
        let clearText = this.add.text(400, 300, 'NIVEL SUPERADO', { fontSize: '32px', fill: '#0f0', backgroundColor: '#000000aa', padding: 10 }).setOrigin(0.5).setScrollFactor(0);
        
        // Lo ocultamos de la cámara con zoom
        this.cameras.main.ignore(clearText); 
        
        this.nadiaText.setText('[Nadia]: ¡La fortaleza ha sido conquistada!');
        
        this.time.delayedCall(3000, () => {
            this.scene.start('MainMenu');
        });
    }

    

    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.physics.pause();
            
            // Creamos el texto de pausa centrado en la pantalla (basado en la cámara UI de 800x600)
            this.pauseText = this.add.text(400, 300, 'PAUSA\nPresiona ESC para continuar\nPresiona M para Menú', { 
                fontSize: '24px', 
                fill: '#fff', 
                align: 'center', 
                backgroundColor: '#000000aa', 
                padding: 20 
            }).setOrigin(0.5).setScrollFactor(0);
            
            // ¡LA SOLUCIÓN! Le decimos a la cámara principal (la del zoom) que ignore este texto
            this.cameras.main.ignore(this.pauseText);
            
            this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
            this.menuKey.on('down', () => {
                // Reseteo antes de salir al Menú Principal
                this.isPaused = false;
                this.physics.resume();
                this.scene.stop(); // Detiene la escena actual
                this.scene.start('MainMenu');
            });
        } else {
            // Quitamos la pausa
            this.physics.resume();
            if (this.pauseText) this.pauseText.destroy();
            if (this.menuKey) this.menuKey.destroy();
        }
    }
}