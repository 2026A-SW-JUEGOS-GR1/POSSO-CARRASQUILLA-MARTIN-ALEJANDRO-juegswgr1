class Level3 extends Phaser.Scene {
    constructor() {
        super({ key: 'Level3' });
        this.score = 5000; // Iniciamos con un puntaje alto que irá bajando
        this.lives = 3;
        this.isPaused = false;
        
        // Variables para el Dash
        this.isDashing = false;
        this.canDash = true;
    }

    preload() {
        // Carga de assets del Escenario 3
        this.load.image('fondo_japon', 'assets/japan.png'); 
        this.load.image('tiles_japon', 'assets/tiles-japan.png'); 
        this.load.tilemapTiledJSON('mapa_japon', 'mapa_japon.json'); 
        
        // Cargamos el tilesheet para el shuriken (Tile 115 -> Frame 114)
        this.load.spritesheet('tiles_japon_sheet', 'assets/tiles-japan.png', { frameWidth: 65, frameHeight: 65 });
        this.load.spritesheet('drago', 'assets/drago.png', { frameWidth: 100, frameHeight: 99 });
    }

    create() {
        this.isPaused = false;
        this.physics.resume();
        this.score = 5000;
        this.lives = 3;
        this.isDashing = false;
        this.canDash = true;

        // 1. FONDO PRIMERO
        this.add.image(0, 0, 'fondo_japon').setOrigin(0, 0);

        // 2. CREACIÓN DEL MAPA
        const map = this.make.tilemap({ key: 'mapa_japon' });
        const tileset = map.addTilesetImage('background-japan', 'tiles_japon');
        
        this.capaPlataformas = map.createLayer('platforms', tileset, 0, 0);
        this.capaPlataformas.setCollisionByExclusion([-1]);

        // 3. CREACIÓN DE DRAGO
        this.player = this.physics.add.sprite(100, 100, 'drago');
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(50, 95);
        this.player.body.setOffset(8, 4);
        this.physics.add.collider(this.player, this.capaPlataformas);

        // Animaciones
        if (!this.anims.exists('walk')) {
            this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('drago', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'idle', frames: [{ key: 'drago', frame: 0 }], frameRate: 10 });
        }
        this.player.play('idle');

        // ==========================================
        // MECÁNICA 1: TRAMPOLINES (Tiles 196, 197, 198)
        // ==========================================
        // Le pasamos un arreglo de IDs a Phaser para que aplique la misma función a todos
        this.capaPlataformas.setTileIndexCallback([196, 197, 198], this.triggerTrampoline, this);

        // ==========================================
        // MECÁNICA 2: SHURIKENS DE PARED (Trampa 42 -> Lanza 115)
        // ==========================================
        this.shurikenGroup = this.physics.add.group({
            allowGravity: false // Los shurikens vuelan en línea recta
        });

        // Buscamos dónde pusiste las trampas 42 y guardamos sus coordenadas
        this.trapPositions = [];
        this.capaPlataformas.forEachTile(tile => {
            if (tile.index === 42) {
                this.trapPositions.push({ x: tile.pixelX + (tile.width / 2), y: tile.pixelY + (tile.height / 2) });
            }
        });

        // Temporizador para disparar cada 3 segundos
        this.time.addEvent({
            delay: 3000,
            loop: true,
            callback: this.fireShurikens,
            callbackScope: this
        });

        // Colisión de Shurikens con las plataformas (Desaparecen)
        this.physics.add.collider(this.shurikenGroup, this.capaPlataformas, (shuriken, tile) => {
            shuriken.destroy();
        });
        // Colisión de Shurikens con Drago (Pierde vida)
        this.physics.add.overlap(this.player, this.shurikenGroup, this.hitByShuriken, null, this);

        // ==========================================
        // MECÁNICA 3: META DEL NIVEL (Tile 50)
        // ==========================================
        this.capaPlataformas.setTileIndexCallback(50, this.levelClear, this);

        // ==========================================
        // MECÁNICA 4: PUNTUACIÓN POR VELOCIDAD
        // ==========================================
        this.scoreTimer = this.time.addEvent({
            delay: 1000, // Cada segundo
            loop: true,
            callback: () => {
                if (!this.isPaused && this.score > 0) {
                    this.score -= 10; // Restamos puntos por tardar
                    this.scoreText.setText('Puntos: ' + this.score);
                }
            }
        });

        // Controles e UI
        this.cursors = this.input.keyboard.createCursorKeys();
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // UI narrativo (Nadia guiando a Drago)
        this.nadiaText = this.add.text(400, 16, '[Nadia]: ¡Drago, muévete! El tiempo colapsa.', { fontSize: '20px', fill: '#0ff', fontStyle: 'italic' }).setOrigin(0.5, 0).setScrollFactor(0);
        this.scoreText = this.add.text(16, 50, 'Puntos: 5000', { fontSize: '24px', fill: '#fff' }).setScrollFactor(0);
        this.livesText = this.add.text(16, 80, 'Vidas: 3', { fontSize: '24px', fill: '#ff0000' }).setScrollFactor(0);

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }

        if (this.isPaused) return;

        // ==========================================
        // LÓGICA DEL DASH (Impulso)
        // ==========================================
        if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && this.canDash && !this.isDashing) {
            this.executeDash();
        }

        // Movimiento Básico (Solo funciona si NO está haciendo dash)
        if (!this.isDashing) {
            if (this.cursors.left.isDown) {
                this.player.setVelocityX(-200);
                this.player.anims.play('walk', true);
                this.player.flipX = true;
            } else if (this.cursors.right.isDown) {
                this.player.setVelocityX(200);
                this.player.anims.play('walk', true);
                this.player.flipX = false;
            } else {
                this.player.setVelocityX(0);
                this.player.anims.play('idle', true);
            }

            // Salto normal (-450)
            if (this.cursors.up.isDown && this.player.body.onFloor()) {
                this.player.setVelocityY(-450);
            }
        }

        // Lógica si cae al abismo
        if (this.player.y > this.physics.world.bounds.height - 50) {
            this.loseLife();
        }

        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }
    }

    // --- Funciones de Mecánicas ---

    executeDash() {
        this.isDashing = true;
        this.canDash = false;
        
        // Calculamos la dirección basados en hacia dónde mira Drago
        let direction = this.player.flipX ? -1 : 1;
        
        // Congelamos la gravedad temporalmente para que el dash sea perfectamente horizontal
        this.player.body.setAllowGravity(false);
        this.player.setVelocityY(0);
        
        // Velocidad explosiva del dash
        this.player.setVelocityX(800 * direction);
        
        // Efecto visual rápido
        this.player.setTint(0x00ffff);

        // Terminar el dash después de 200 milisegundos
        this.time.delayedCall(200, () => {
            this.isDashing = false;
            this.player.body.setAllowGravity(true);
            this.player.clearTint();
        });

        // Cooldown: No puede volver a hacer dash por 1.5 segundos
        this.time.delayedCall(1500, () => {
            this.canDash = true;
        });
    }

    triggerTrampoline(sprite, tile) {
        if (sprite === this.player) {
            
            // CONDICIÓN 1: Drago debe estar cayendo (velocity.y > 0)
            // CONDICIÓN 2: Los pies de Drago (bottom) deben estar en la parte superior del tile
            if (this.player.body.velocity.y > 0 && this.player.body.bottom <= tile.pixelY + 20) {
                
                // TRUCO EXPERTO: Usamos delayedCall con 0 milisegundos.
                // Esto programa el salto para que ocurra justo en el instante en que 
                // Phaser termina sus cálculos de colisión.
                this.time.delayedCall(0, () => {
                    // Ahora sí, el impulso se aplica limpiamente sin ser sobrescrito
                    this.player.setVelocityY(-850);
                });
                
                // Actualizamos el diálogo de Nadia
                this.nadiaText.setText('[Nadia]: ¡Gran salto!');
            }
        }
    }

    fireShurikens() {
        if (this.isPaused) return;

        this.trapPositions.forEach(pos => {
            // Instanciamos el shuriken usando el frame 114 (Tile 115)
            let shuriken = this.shurikenGroup.create(pos.x, pos.y, 'tiles_japon_sheet', 114);
            
            // Avanzan hacia la derecha a 300px/s
            shuriken.setVelocityX(300); 
            
            // Rotación constante para que se vea animado al volar
            shuriken.setAngularVelocity(400); 
            
            // Hacemos el hitbox circular
            shuriken.setCircle(16);
        });
    }

    hitByShuriken(player, shuriken) {
        shuriken.destroy(); // Destruir proyectil
        this.loseLife();
    }

    levelClear(sprite, tile) {
        if (sprite === this.player) {
            this.physics.pause();
            this.scoreTimer.remove(); // Detenemos la pérdida de puntos
            
            this.add.text(400, 300, 'LEVEL CLEAR', { fontSize: '64px', fill: '#0f0', fontStyle: 'bold', backgroundColor: '#000000aa', padding: 20 }).setOrigin(0.5).setScrollFactor(0);
            this.nadiaText.setText(`[Nadia]: ¡Misión cumplida! Puntuación final: ${this.score}`);
            
            this.time.delayedCall(3000, () => {
                this.scene.start('MainMenu');
            });
        }
    }

    loseLife() {
        this.lives--;
        this.livesText.setText('Vidas: ' + this.lives);
        this.score -= 500; // Penalización por morir
        
        if (this.lives <= 0) {
            this.add.text(400, 300, 'GAME OVER', { fontSize: '64px', fill: '#f00', backgroundColor: '#000' }).setOrigin(0.5).setScrollFactor(0);
            this.physics.pause();
            this.scoreTimer.remove();
            
            setTimeout(() => {
                this.scene.start('MainMenu');
            }, 3000);
        } else {
            this.player.setPosition(100, 100);
            this.player.setVelocity(0, 0);
            this.nadiaText.setText('[Nadia]: Rebobinando tiempo...');
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.physics.pause();
            this.pauseText = this.add.text(400, 300, 'PAUSA\nPresiona ESC para continuar\nPresiona M para Menú', { fontSize: '32px', fill: '#fff', align: 'center', backgroundColor: '#000000aa', padding: 20 }).setOrigin(0.5).setScrollFactor(0);
            
            this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
            this.menuKey.on('down', () => {
                this.isPaused = false;
                this.physics.resume();
                this.scene.stop(); // Detiene por completo la escena actual para borrarla de la memoria
                this.scene.start('MainMenu');
            });
        } else {
            this.physics.resume();
            this.pauseText.destroy();
            this.menuKey.destroy();
        }
    }
}