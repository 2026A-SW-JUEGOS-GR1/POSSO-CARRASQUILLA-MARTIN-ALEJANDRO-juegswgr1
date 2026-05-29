class Level2 extends Phaser.Scene {
    constructor() {
        super({ key: 'Level2' });
        this.score = 0;
        this.lives = 3;
        this.isPaused = false;
        
        // Variables para el doble salto
        this.jumps = 0;
        this.hasAmuletPower = false;
    }

    preload() {
        // Carga de assets del Escenario 2
        this.load.image('fondo_egipto', 'assets/desert.jpeg'); 
        this.load.image('tiles_egipto', 'assets/tiles-egypt.png'); 
        this.load.tilemapTiledJSON('mapa_egipto', 'mapa_egipto.json'); 
        
        // Cargamos el tilesheet para extraer la roca (asumiendo 65x65 según tu JSON)
        this.load.spritesheet('tiles_egipto_sheet', 'assets/tiles-egypt.png', { frameWidth: 65, frameHeight: 65 });
        
        // El sprite de Drago (si ya se cargó en Level1, no es estrictamente necesario, pero es buena práctica)
        this.load.spritesheet('drago', 'assets/drago.png', { frameWidth: 100, frameHeight: 99 });
    }

    create() {
        this.score = 0;
        this.lives = 3;
        this.hasAmuletPower = false;
        this.jumps = 0;

        // 1. FONDO PRIMERO
        this.add.image(0, 0, 'fondo_egipto').setOrigin(0, 0);

        // 2. CREACIÓN DEL MAPA
        const map = this.make.tilemap({ key: 'mapa_egipto' });
        const tileset = map.addTilesetImage('background-egypt', 'tiles_egipto');
        
        this.capaPlataformas = map.createLayer('platforms', tileset, 0, 0);
        this.capaPlataformas.setCollisionByExclusion([-1]);

        // 3. CREACIÓN DE DRAGO
        this.player = this.physics.add.sprite(100, 100, 'drago');
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(70, 95);
        this.player.body.setOffset(8, 4);
        this.physics.add.collider(this.player, this.capaPlataformas);

        // Animaciones (Misma lógica que configuraste previamente)
        if (!this.anims.exists('walk')) {
            this.anims.create({
                key: 'walk',
                frames: this.anims.generateFrameNumbers('drago', { start: 0, end: 5 }),
                frameRate: 10,
                repeat: -1
            });
            this.anims.create({
                key: 'idle',
                frames: [{ key: 'drago', frame: 0 }],
                frameRate: 10
            });
        }
        this.player.play('idle');

        // ==========================================
        // MECÁNICA 1: ROCAS RODANTES (Tile 12)
        // ==========================================
        this.rocksGroup = this.physics.add.group({
            bounceY: 0.4, // Hacemos que reboten un poco al caer
            bounceX: 0.4,
            collideWorldBounds: true
        });

        this.capaPlataformas.forEachTile(tile => {
            if (tile.index === 12) {
                let x = tile.pixelX + (tile.width / 2);
                let y = tile.pixelY + (tile.height / 2);
                
                // Extraemos el frame 11 (Tile ID 12 - 1)
                let rock = this.rocksGroup.create(x, y, 'tiles_egipto_sheet', 11);
                rock.setCircle(32); // Convertimos su caja de colisión en un círculo perfecto
                
                // Le damos un pequeño empuje aleatorio inicial para que empiecen a rodar
                rock.setVelocityX(Phaser.Math.Between(-50, 50));
                
                this.capaPlataformas.removeTileAt(tile.x, tile.y);
            }
        });

        // Físicas de las rocas
        this.physics.add.collider(this.rocksGroup, this.capaPlataformas);
        // Si Drago toca una roca, pierde vida
        this.physics.add.overlap(this.player, this.rocksGroup, this.hitByRock, null, this);

        // ==========================================
        // MECÁNICA 2: AMULETO DE DOBLE SALTO (Tile 86)
        // ==========================================
        this.capaPlataformas.setTileIndexCallback(86, this.collectAmulet, this);

        // ==========================================
        // MECÁNICA 3: PUNTUACIÓN POR SUPERVIVENCIA
        // ==========================================
        this.scoreTimer = this.time.addEvent({
            delay: 1000, // Cada 1000ms (1 segundo)
            callback: () => {
                if (!this.isPaused && this.lives > 0) {
                    this.score += 10;
                    this.scoreText.setText('Puntos: ' + this.score);
                }
            },
            callbackScope: this,
            loop: true // Se repite infinitamente
        });

        // Controles e UI
        this.cursors = this.input.keyboard.createCursorKeys();
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.scoreText = this.add.text(16, 16, 'Puntos: 0', { fontSize: '24px', fill: '#fff' }).setScrollFactor(0);
        this.livesText = this.add.text(16, 50, 'Vidas: 3', { fontSize: '24px', fill: '#ff0000' }).setScrollFactor(0);
        this.powerText = this.add.text(16, 80, '', { fontSize: '20px', fill: '#ffff00' }).setScrollFactor(0);

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    }

    update() {
        if (this.isPaused) return;

        // ==========================================
        // LÓGICA DE ARENA MOVEDIZA (Tile 244)
        // ==========================================
        let currentSpeed = 200; // Velocidad base
        
        // Comprobamos el tile que está justo 1 píxel por debajo del centro de Drago
        let tileUnder = this.capaPlataformas.getTileAtWorldXY(this.player.x, this.player.body.bottom + 1);
        
        if (tileUnder && tileUnder.index === 244) {
            currentSpeed = 100; // Ralentizado a la mitad si pisa arena
            this.player.setTint(0xffcc99); // Opcional: Teñimos a Drago de color arena suave
        } else {
            this.player.clearTint(); // Restaura su color normal
        }

        // Movimiento Horizontal
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-currentSpeed);
            this.player.anims.play('walk', true);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(currentSpeed);
            this.player.anims.play('walk', true);
            this.player.flipX = false;
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('idle', true);
        }

        // ==========================================
        // LÓGICA DE SALTO Y DOBLE SALTO
        // ==========================================
        // Usamos onFloor() para saber de forma segura si toca el suelo
        const isGrounded = this.player.body.onFloor();

        if (isGrounded) {
            this.jumps = 0; // Reiniciamos los saltos al tocar el piso
        }

        // JustDown asegura que el jugador deba presionar la tecla de nuevo para el segundo salto, 
        // evitando que salte dos veces instantáneamente si deja el botón presionado
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            if (isGrounded) {
                // Primer salto
                this.player.setVelocityY(-450);
                this.jumps = 1;
            } else if (this.hasAmuletPower && this.jumps === 1) {
                // Segundo salto en el aire (solo si tiene el poder y ya hizo 1 salto)
                this.player.setVelocityY(-450);
                this.jumps = 2;
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

    collectAmulet(sprite, tile) {
        if (sprite === this.player) {
            this.capaPlataformas.removeTileAt(tile.x, tile.y);
            this.hasAmuletPower = true;
            this.powerText.setText('¡Poder: Doble Salto!');

            // Temporizador de 10 segundos (10000 ms) para quitar el poder
            this.time.delayedCall(10000, () => {
                this.hasAmuletPower = false;
                this.powerText.setText('');
            });
        }
    }

    hitByRock(player, rock) {
        // Destruimos la roca al impacto para no recibir daño múltiple en un instante
        rock.destroy(); 
        
        // Opcional: penalización de puntos
        this.score = Math.max(0, this.score - 50); 
        this.scoreText.setText('Puntos: ' + this.score);
        
        this.loseLife();
    }

    loseLife() {
        this.lives--;
        this.livesText.setText('Vidas: ' + this.lives);
        
        if (this.lives <= 0) {
            this.add.text(400, 300, 'GAME OVER', { fontSize: '64px', fill: '#f00', backgroundColor: '#000' }).setOrigin(0.5).setScrollFactor(0);
            this.physics.pause();
            
            setTimeout(() => {
                this.scene.start('MainMenu');
            }, 3000);
        } else {
            // Regresamos a Drago al inicio
            this.player.setPosition(100, 100);
            this.player.setVelocity(0, 0);
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.physics.pause();
            this.pauseText = this.add.text(400, 300, 'PAUSA\nPresiona M para Menú', { fontSize: '32px', fill: '#fff', align: 'center', backgroundColor: '#000000aa', padding: 20 }).setOrigin(0.5).setScrollFactor(0);
            
            this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
            this.menuKey.on('down', () => {
                this.scene.start('MainMenu');
            });
        } else {
            this.physics.resume();
            this.pauseText.destroy();
            this.menuKey.destroy();
        }
    }
}