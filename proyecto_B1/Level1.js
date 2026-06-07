class Level1 extends Phaser.Scene {
    constructor() {
        super({ key: 'Level1' });
        this.score = 0;
        this.lives = 3;
        this.isPaused = false;
    }

    preload() {
        // Para el mapa estático
        this.load.image('tiles_roma', 'assets/tiles-rome.png'); 
        this.load.tilemapTiledJSON('mapa_roma', './mapa_roma.json'); 
        this.load.image('fondo_roma', 'assets/coliseo2.jpeg');
        
        // Cargamos el MISMO tileset pero como spritesheet. 
        // Esto nos permite extraer un solo bloque (el 115) para las plataformas móviles.
        // Tu JSON indica que los tiles son de 65x65 píxeles.
        this.load.spritesheet('tiles_roma_sheet', 'assets/tiles-rome.png', { frameWidth: 65, frameHeight: 65 });

        this.load.spritesheet('drago', 'assets/drago.png', { frameWidth: 100, frameHeight: 99 });
    }

    create() {
        this.isPaused = false;
        this.physics.resume();
        this.score = 0;
        this.lives = 3;
        this.gemsCollected = 0;
        this.totalGems = 3;

        // 1. CARGA DEL MAPA CORREGIDA
        this.add.image(0, 0, 'fondo_roma').setOrigin(0, 0);
        const map = this.make.tilemap({ key: 'mapa_roma' });
        
        // Coincide con el nombre "background-rome" del JSON
        const tileset = map.addTilesetImage('background-rome', 'tiles_roma');

        if (!tileset) {
            console.error("Error: Phaser no pudo vincular el tileset. Revisa el nombre 'background-rome'.");
        }

        // Coincide con el nombre "Tile Layer 1" del JSON
        // Guardamos la capa en 'this' para poder acceder a ella en otras funciones
        this.capaPlataformas = map.createLayer('platforms', tileset, 0, 0);
        if (!this.capaPlataformas) {
            console.error("No se pudo crear la capa 'platforms'. Capas disponibles:", 
            map.layers.map(l => l.name || l.layer.name));
        }
        console.log("Capa creada correctamente:", this.capaPlataformas ? "SÍ" : "NO");
        console.log("Tiles en la capa:", this.capaPlataformas.layer.data.length);
        
        // Colisiones base basadas en la propiedad del JSON
        this.capaPlataformas.setCollisionByExclusion([-1]);

        // 2. CREACIÓN DE DRAGO
        this.player = this.physics.add.sprite(100, 100, 'drago');
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(40, 60);
        this.physics.add.collider(this.player, this.capaPlataformas);

        // 3. ANIMACIONES (Registrando los estados)
        // Animación de caminar (Asumiendo que los frames de caminar son del 0 al 5)
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers('drago', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1 // -1 significa que se repite en bucle infinito
        });

        // Animación de reposo (Idle)
        this.anims.create({
            key: 'idle',
            frames: [{ key: 'drago', frame: 0 }], // Usa el frame que prefieras para reposo
            frameRate: 10
        });

        // Iniciamos con la animación de reposo
        this.player.play('idle');

        // ==========================================
        // MECÁNICA 1: TRAMPAS DE PINCHOS (Tile 120)
        // ==========================================
        // Asignamos un evento: si se toca el tile 120, ejecuta this.hitSpike
        this.capaPlataformas.setTileIndexCallback(120, this.hitSpike, this);

        // ==========================================
        // MECÁNICA 2: COLUMNAS COLAPSABLES (Tile 247)
        // ==========================================
        // Si se toca el tile 247, ejecuta this.collapseColumn
        this.capaPlataformas.setTileIndexCallback(247, this.collapseColumn, this);

        // ==========================================
        // MECÁNICA 3: PLATAFORMAS MÓVILES (Tile 115)
        // ==========================================
        // Creamos un grupo físico para manejar todas las plataformas móviles juntas
        this.movingPlatforms = this.physics.add.group({
            allowGravity: false, // No caen
            immovable: true      // No se empujan cuando Drago salta sobre ellas
        });
        
        

        // Iteramos por todo el mapa buscando los tiles 115
        this.capaPlataformas.forEachTile(tile => {
            if (tile.index === 238) {
                // Instanciamos un sprite en el centro exacto del tile
                let x = tile.pixelX + (tile.width / 2);
                let y = tile.pixelY + (tile.height / 2);
                
                // Nota: En Phaser, el frame es el ID del tile - 1. Así que 115 es el frame 114.
                let platform = this.movingPlatforms.create(x, y, 'tiles_roma_sheet', 237);
                
                // Propiedades personalizadas para el movimiento
                platform.startX = x;
                platform.direction = 1; // 1 = derecha, -1 = izquierda
                platform.speed = 200;

                // Eliminamos el tile original para que no estorbe
                this.capaPlataformas.removeTileAt(tile.x, tile.y);
                
            }
        });

        // Hacemos que Drago colisione con el grupo de plataformas móviles
        this.physics.add.collider(this.player, this.movingPlatforms);

        // ==========================================
        

        // Controles e UI
        this.cursors = this.input.keyboard.createCursorKeys();
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.scoreText = this.add.text(16, 16, 'Puntos: 0', { fontSize: '24px', fill: '#fff' }).setScrollFactor(0);
        this.livesText = this.add.text(16, 50, 'Vidas: 3', { fontSize: '24px', fill: '#ff0000' }).setScrollFactor(0);

        this.capaPlataformas.setTileIndexCallback(58, this.collectGem, this);

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    }

    update(time, delta) {
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }

        if (this.isPaused) return;

        // 4. MOVIMIENTO Y ANIMACIONES
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.player.anims.play('walk', true);
            this.player.flipX = true; // Voltea el sprite hacia la izquierda
        } 
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            this.player.anims.play('walk', true);
            this.player.flipX = false; // El sprite mira hacia la derecha (original)
        } 
        else {
            this.player.setVelocityX(0);
            this.player.anims.play('idle', true); // Se detiene la animación
        }

        // Salto: Usamos onFloor() o blocked.down para asegurarnos de que esté tocando el suelo
        if (this.cursors.up.isDown && this.player.body.blocked.down) {
            this.player.setVelocityY(-400);
            // Opcional: Aquí podrías añadir una animación de salto en el futuro
        }

        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }

        // LÓGICA DE ACTUALIZACIÓN: Plataformas Móviles
        // Movemos cada plataforma instanciada
        this.movingPlatforms.getChildren().forEach(platform => {
            // Movimiento basado en el tiempo (delta) para que sea suave
            platform.x += platform.speed * platform.direction * (delta / 1000);
            
            // Si se aleja 150 píxeles de su punto de origen, invierte la dirección
            if (platform.x > platform.startX + 150) {
                platform.direction = -1;
            } else if (platform.x < platform.startX - 150) {
                platform.direction = 1;
            }
        });

        // Lógica de Vidas si cae al vacío
        if (this.player.y > this.physics.world.bounds.height - 50) {
            this.loseLife();
        }
    }

    // Funciones Callback para las Mecánicas
    hitSpike(sprite, tile) {
        // Solo quitamos vida si el sprite que toca el pincho es Drago
        if (sprite === this.player) {
            // Separamos un poco a Drago para evitar que pierda 3 vidas en un milisegundo por superposición
            this.player.y -= 10; 
            this.loseLife();
        }
    }

    collapseColumn(sprite, tile) {
        // Verificamos que sea Drago y que la columna no esté ya en proceso de caerse
        if (sprite === this.player && !tile.isCollapsing) {
            // Bandera para evitar que el temporizador se ejecute 60 veces por segundo
            tile.isCollapsing = true; 
            
            // Cambiamos el color de la columna para dar feedback visual al jugador
            tile.tint = 0xff0000; // Se tiñe de rojo

            // Temporizador de 2 segundos (2000 milisegundos)
            this.time.delayedCall(200, () => {
                this.capaPlataformas.removeTileAt(tile.x, tile.y);
            });
        }
    }

    loseLife() {
        this.lives--;
        this.livesText.setText('Vidas: ' + this.lives);
        
        if (this.lives <= 0) {
            this.add.text(400, 300, 'GAME OVER', { fontSize: '64px', fill: '#f00' }).setOrigin(0.5).setScrollFactor(0);
            this.physics.pause();
            
            setTimeout(() => {
                this.scene.start('MainMenu');
            }, 3000);
        } else {
            // Punto de reaparición. Ajusta estas coordenadas según tu mapa
            this.player.setPosition(100, 100);
            this.player.setVelocity(0, 0);
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

    // Función que se ejecuta automáticamente al tocar el Tile 58
    collectGem(sprite, tile) {
        // Nos aseguramos de que sea el personaje quien toca la gema
        if (sprite === this.player) {
            
            // Borramos la gema del mapa para que desaparezca visualmente y no se vuelva a tocar
            this.capaPlataformas.removeTileAt(tile.x, tile.y);
            
            // Sumamos puntos (por ejemplo, 100 por gema) y actualizamos el texto en pantalla
            this.score += 100;
            this.scoreText.setText('Puntos: ' + this.score);
            
            // Incrementamos el contador de gemas recolectadas
            this.gemsCollected++;
            
            // Verificamos si se alcanzó la condición de victoria
            if (this.gemsCollected === this.totalGems) {
                this.levelClear();
            }
        }
    }

    // Función que maneja la victoria del escenario
    levelClear() {
        // Detenemos las físicas para que Drago no siga cayendo o moviéndose
        this.physics.pause();
        
        // Creamos el texto de "LEVEL CLEAR" en verde (#0f0) centrado en la pantalla
        this.add.text(400, 300, 'LEVEL CLEAR', { 
            fontSize: '64px', 
            fill: '#0f0', 
            fontStyle: 'bold',
            backgroundColor: '#000000aa', 
            padding: 20 
        }).setOrigin(0.5).setScrollFactor(0);
        
        // Usamos un temporizador nativo de Phaser para esperar 3 segundos (3000 ms) 
        // antes de enviarlo de vuelta al Menú Principal
        this.time.delayedCall(3000, () => {
            this.scene.start('MainMenu');
        });
    }


}