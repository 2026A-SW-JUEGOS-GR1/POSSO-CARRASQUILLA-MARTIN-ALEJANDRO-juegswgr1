class Level2 extends Phaser.Scene {
    constructor() {
        super({ key: 'Level2' });
        this.score = 0;
        this.lives = 1; // Ahora solo tiene 1 vida
        this.isPaused = false;
        
        this.jumps = 0;
        this.hasAmuletPower = false;
        this.heatTimer = 15; // Temporizador de supervivencia
    }

    preload() {
        this.load.image('fondo_egipto', 'assets/desert.jpg'); 
        this.load.image('tiles_egipto', 'assets/tiles-egypt.png'); 
        this.load.tilemapTiledJSON('mapa_egipto', 'mapa_egipto.json'); 
        
        this.load.spritesheet('tiles_egipto_sheet', 'assets/tiles-egypt.png', { frameWidth: 65, frameHeight: 65 });
        this.load.spritesheet('drago', 'assets/drago.png', { frameWidth: 100, frameHeight: 99 });
    }

    create() {
        this.isPaused = false;
        this.physics.resume();
        this.score = 0;
        this.lives = 1;
        this.hasAmuletPower = false;
        this.jumps = 0;
        this.heatTimer = 15;

        // 1. FONDO
        this.add.image(0, 0, 'fondo_egipto').setOrigin(0, 0);

        // 2. MAPA
        const map = this.make.tilemap({ key: 'mapa_egipto' });
        const tileset = map.addTilesetImage('background-egypt', 'tiles_egipto');
        this.capaPlataformas = map.createLayer('platforms', tileset, 0, 0);
        this.capaPlataformas.setCollisionByExclusion([-1]);

        // ==========================================
        // SISTEMA DE REAPARICIÓN (Posiciones Válidas)
        // ==========================================
        this.validSpawnPoints = [];
        // Escaneamos el mapa buscando bloques sólidos que tengan un espacio vacío arriba
        for (let x = 0; x < map.width; x++) {
            for (let y = 0; y < map.height - 1; y++) {
                let tileBelow = this.capaPlataformas.getTileAt(x, y + 1);
                let tileCurrent = this.capaPlataformas.getTileAt(x, y);

                // Si hay suelo abajo y NO hay nada en la posición actual
                if (tileBelow && tileBelow.index !== -1 && (!tileCurrent || tileCurrent.index === -1)) {
                    this.validSpawnPoints.push({
                        x: tileBelow.pixelX + (tileBelow.width / 2),
                        y: tileBelow.pixelY - 32 // Posicionado justo sobre el suelo
                    });
                }
            }
        }

        // 3. DRAGO
        this.player = this.physics.add.sprite(100, 100, 'drago');
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(70, 95);
        this.player.body.setOffset(8, 4);
        this.physics.add.collider(this.player, this.capaPlataformas);

        if (!this.anims.exists('walk')) {
            this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('drago', { start: 0, end: 6 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'idle', frames: [{ key: 'drago', frame: 0 }], frameRate: 10 });
        }
        this.player.play('idle');

        // ==========================================
        // OBJETOS Y TRAMPAS (Extrayendo del JSON)
        // ==========================================
        this.rocksGroup = this.physics.add.group({
            bounceY: 0.4, 
            bounceX: 0.1,
            collideWorldBounds: false // FALSO para que puedan caer al vacío
        });

        // Variables para guardar nuestros items
        let amuletStartPos = { x: -100, y: -100 };
        let survivalStartPos = { x: -100, y: -100 };

        this.capaPlataformas.forEachTile(tile => {
            let px = tile.pixelX + (tile.width / 2);
            let py = tile.pixelY + (tile.height / 2);

            // Rocas (ID 12)
            if (tile.index === 12) {
                let rock = this.rocksGroup.create(px, py, 'tiles_egipto_sheet', 11);
                rock.setCircle(32);
                rock.startX = px; // Guardamos su posición inicial
                rock.startY = py;
                
                // Le damos un empujón fuerte y definitivo hacia la izquierda o derecha
                let initialDirection = Math.random() > 0.5 ? 100 : -100;
                rock.setVelocityX(initialDirection);
                
                this.capaPlataformas.removeTileAt(tile.x, tile.y);
            }
            // Amuleto (ID 86)
            else if (tile.index === 86) {
                amuletStartPos = { x: px, y: py };
                this.capaPlataformas.removeTileAt(tile.x, tile.y);
            }
            // Objeto de Supervivencia (ID 55)
            else if (tile.index === 55) {
                survivalStartPos = { x: px, y: py };
                this.capaPlataformas.removeTileAt(tile.x, tile.y);
            }
        });

        // Instanciar Items como Sprites
        this.amuletItem = this.physics.add.sprite(amuletStartPos.x, amuletStartPos.y, 'tiles_egipto_sheet', 85);
        this.amuletItem.body.allowGravity = false; // Flota en el aire
        
        this.survivalItem = this.physics.add.sprite(survivalStartPos.x, survivalStartPos.y, 'tiles_egipto_sheet', 54);
        this.survivalItem.body.allowGravity = false;

        // Colisiones e Interacciones
        this.physics.add.collider(this.player, this.capaPlataformas);

        this.physics.add.collider(
            this.rocksGroup, 
            this.capaPlataformas, 
            null, // Callback de colisión normal (no lo usamos aquí)
            (rock, tile) => {
                // Filtro: Si el tile está en la última fila del mapa (índice 19), 
                // devolvemos 'false' para cancelar la colisión y que la roca caiga.
                if (tile.y === 19) {
                    return false; 
                }
                // Si es cualquier otro tile (paredes o pisos más altos), devolvemos 'true'
                return true; 
            }, 
            this
        )

        this.physics.add.overlap(this.player, this.rocksGroup, this.hitByRock, null, this);
        this.physics.add.overlap(this.player, this.amuletItem, this.collectAmulet, null, this);
        this.physics.add.overlap(this.player, this.survivalItem, this.collectSurvival, null, this);

        // ==========================================
        // TEMPORIZADORES PRINCIPALES
        // ==========================================
        // Timer de Puntos y Supervivencia (cada 1 segundo)
        this.gameTimer = this.time.addEvent({
            delay: 1000, 
            callback: this.tickSecond,
            callbackScope: this,
            loop: true
        });

        // UI
        this.cursors = this.input.keyboard.createCursorKeys();
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Interfaz de Nadia y Stats
        this.nadiaText = this.add.text(400, 16, '[Nadia]: ¡El calor es extremo! Busca la reliquia para sobrevivir.', { fontSize: '20px', fill: '#ffcc00', fontStyle: 'italic' }).setOrigin(0.5, 0).setScrollFactor(0);
        this.scoreText = this.add.text(16, 50, 'Puntos: 0 / 3000', { fontSize: '24px', fill: '#fff' }).setScrollFactor(0);
        this.heatText = this.add.text(16, 80, 'Calor: 15s', { fontSize: '24px', fill: '#ff5500' }).setScrollFactor(0);
        this.powerText = this.add.text(16, 110, '', { fontSize: '20px', fill: '#00ffff' }).setScrollFactor(0);

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }

        if (this.isPaused) return;

        // ARENA MOVEDIZA (ID 244)
        let currentSpeed = 200;
        let tileUnder = this.capaPlataformas.getTileAtWorldXY(this.player.x, this.player.body.bottom + 1);
        
        if (tileUnder && tileUnder.index === 244) {
            currentSpeed = 75;
            this.player.setTint(0xffcc99);
        } else {
            this.player.clearTint();
        }

        // MOVIMIENTO
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

        // DOBLE SALTO
        const isGrounded = this.player.body.onFloor();
        if (isGrounded) this.jumps = 0;

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            if (isGrounded) {
                this.player.setVelocityY(-450);
                this.jumps = 1;
            } else if (this.hasAmuletPower && this.jumps === 1) {
                this.player.setVelocityY(-450);
                this.jumps = 2;
            }
        }

        // REINICIO DE ROCAS QUE CAEN AL VACÍO
        this.rocksGroup.getChildren().forEach(rock => {
            // Si la roca supera el límite inferior de la pantalla por 50 píxeles
            if (rock.y > this.physics.world.bounds.height + 50) {
                rock.setPosition(rock.startX, rock.startY);
                rock.setVelocity(-70, 0); // Vuelve a caer
            }
        });

        // CAÍDA DEL JUGADOR
        if (this.player.y > this.physics.world.bounds.height - 50) {
            this.loseLife();
        }

        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) this.togglePause();
    }

    // --- Funciones Propias ---

    tickSecond() {
        if (this.isPaused || this.lives <= 0) return;

        // Lógica de Puntos
        this.score += 100; // Ajustado a 100 para no hacer el nivel de 300 segundos
        this.scoreText.setText('Puntos: ' + this.score + ' / 3000');

        // Condición de Victoria
        if (this.score >= 3000) {
            this.levelClear();
            return;
        }

        // Lógica de Supervivencia
        this.heatTimer -= 1;
        this.heatText.setText('Calor: ' + this.heatTimer + 's');

        if (this.heatTimer <= 0) {
            this.nadiaText.setText('[Nadia]: ¡Drago ha sucumbido al calor del desierto!');
            this.loseLife();
        }
    }

    collectSurvival(player, item) {
        // Resetea el tiempo
        this.heatTimer = 15;
        this.heatText.setText('Calor: 15s');
        this.nadiaText.setText('[Nadia]: ¡Tiempo restaurado! Sigue aguantando.');

        // Reubica el objeto a una posición aleatoria segura
        let newPos = Phaser.Utils.Array.GetRandom(this.validSpawnPoints);
        item.setPosition(newPos.x, newPos.y);
    }

    collectAmulet(player, amulet) {
        // Desactiva el amuleto (se vuelve invisible y no tiene colisión)
        amulet.disableBody(true, true);
        this.hasAmuletPower = true;
        this.powerText.setText('¡Poder: Doble Salto!');

        // Timer de 10 segundos
        this.time.delayedCall(10000, () => {
            this.hasAmuletPower = false;
            this.powerText.setText('');

            // Reactiva el amuleto en una nueva posición aleatoria
            let newPos = Phaser.Utils.Array.GetRandom(this.validSpawnPoints);
            amulet.enableBody(true, newPos.x, newPos.y, true, true);
            this.nadiaText.setText('[Nadia]: El amuleto ha reaparecido en otro lugar.');
        });
    }

    hitByRock(player, rock) {
        this.nadiaText.setText('[Nadia]: ¡Cuidado con las rocas!');
        this.loseLife();
    }

    levelClear() {
        this.physics.pause();
        this.gameTimer.remove(); // Detiene el contador
        
        this.add.text(400, 300, 'LEVEL CLEAR', { fontSize: '64px', fill: '#0f0', fontStyle: 'bold', backgroundColor: '#000000aa', padding: 20 }).setOrigin(0.5).setScrollFactor(0);
        this.nadiaText.setText('[Nadia]: ¡Lo logramos! Extracción lista.');
        
        this.time.delayedCall(3000, () => {
            this.scene.start('MainMenu');
        });
    }

    loseLife() {
        this.lives--;
        if (this.lives <= 0) {
            this.add.text(400, 300, 'GAME OVER', { fontSize: '64px', fill: '#f00', backgroundColor: '#000' }).setOrigin(0.5).setScrollFactor(0);
            this.physics.pause();
            this.gameTimer.remove();
            
            setTimeout(() => {
                this.scene.start('MainMenu');
            }, 3000);
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