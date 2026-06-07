class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // PRECARGA DE TILESETS (Basado en tu map.json)
        // Asegúrate de que las rutas a las imágenes coincidan con tus carpetas.
        this.load.image('tiles_map', 'assets/Tiles/Tiles.png');
        this.load.image('Oak_Tree', 'assets/outdoor_decoration/Oak_Tree.png');
        this.load.image('House', 'assets/outdoor_decoration/House_1_Wood_Base_Blue.png');
        this.load.image('Outdoor_Decor', 'assets/outdoor_decoration/Outdoor_Decor_Free.png');
        
        // El resto de assets (personaje, gema, audio) ya deberían estar en tu preload del Menu o aquí.
    }

    create() {
        // 1. Audio
        this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
        this.bgm.play();
        this.collectSound = this.sound.add('collect');

        // 2. Mapa y Entorno (Tiled)
        const map = this.make.tilemap({ key: 'map' });

        // Vincular los nombres de los tilesets en Tiled con los keys en Phaser
        const tilesetSuelo = map.addTilesetImage('tiles_map', 'tiles_map');
        const tilesetArbol = map.addTilesetImage('Oak_Tree', 'Oak_Tree');
        const tilesetCasa = map.addTilesetImage('House_1_Wood_Base_Blue', 'House');
        const tilesetDecoracion = map.addTilesetImage('outdoor_decoration', 'Outdoor_Decor');
        
        // Agrupamos todos los tilesets para usarlos en las capas
        const todosLosTilesets = [tilesetSuelo, tilesetArbol, tilesetCasa, tilesetDecoracion];

        // 3. Creación de Capas Visuales (El orden es importante)
        const capaFondo = map.createLayer('Fondo', todosLosTilesets, 0, 0);
        const capaCaminos = map.createLayer('Caminos', todosLosTilesets, 0, 0);
        const capaColisiones = map.createLayer('Colisiones', todosLosTilesets, 0, 0);
        
        // Ojo al nombre con tilde exactamente como está en tu JSON
        const capaDecoracionFrontal = map.createLayer('Decoración_Frontal', todosLosTilesets, 0, 0);
        
        // La capa frontal debe dibujarse por ENCIMA del jugador (Profundidad alta)
        capaDecoracionFrontal.setDepth(10); 

        // Definir colisiones (Phaser excluye el id -1, es decir, el espacio vacío)
        capaColisiones.setCollisionByExclusion([-1]);

        // Ajustar los límites del mundo a los del mapa (640x480 px)
        this.physics.world.bounds.width = map.widthInPixels;
        this.physics.world.bounds.height = map.heightInPixels;

        // 4. Instanciación de Jugador y Gemas desde 'ObjetosJuego'
        this.gems = this.physics.add.group();
        let conteoGemas = 0;

        // Leemos la capa de objetos del JSON
        const objetosJuego = map.getObjectLayer('ObjetosJuego').objects;

        objetosJuego.forEach(obj => {
            // Evaluamos la posición específica que asignaste al jugador
            if (obj.x === 568 && Math.floor(obj.y) === 453) {
                // Instanciar al jugador
                this.player = this.physics.add.sprite(obj.x, obj.y, 'roly');
                this.player.setCollideWorldBounds(true);
                // Le damos una profundidad menor a la capa frontal para el efecto 3D
                this.player.setDepth(5);
    
                // 2. Ajustar su caja de colisiones (Hitbox) para que pueda caminar por los pasillos de 16x16
                // El tamaño de la caja será de 14x14 para darle un pequeño margen de maniobra
                this.player.body.setSize(14, 14); 
    
                // 3. Centrar el Hitbox (ajusta estos números dependiendo de cómo esté dibujado tu sprite)
                // Usualmente se centra en los pies del personaje
                this.player.body.setOffset(17, 30);
                this.physics.add.collider(this.player, capaColisiones);
            } else {
                // Si no es el jugador, instanciamos una gema
                const gem = this.gems.create(obj.x, obj.y, 'gem');
                conteoGemas++;
            }
        });

        // Colisión entre jugador y gemas
        this.physics.add.overlap(this.player, this.gems, this.collectGem, null, this);

        // Animaciones de roly (Asegúrate de tener el método definido en tu clase)
        this.createAnimations();
        this.cursors = this.input.keyboard.createCursorKeys();

        // Configurar la cámara para que no se salga de los límites del mapa
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // 5. HUD: Sistema de Score y Tiempo
        this.score = 0;
        this.totalGems = conteoGemas; 
        this.timeLeft = 60; 

        // Textos del HUD
        this.scoreText = this.add.text(16, 16, 'Gemas: 0/' + this.totalGems, { fontSize: '20px', fill: '#FFF' });
        this.timeText = this.add.text(500, 16, 'Tiempo: 60', { fontSize: '20px', fill: '#FFF' });

        // Temporizador
        this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    createAnimations() {
        // Tus animaciones (Ajustadas a tu spritesheet)
        this.anims.create({ key: 'down', frames: this.anims.generateFrameNumbers('roly', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('roly', { start: 3, end: 4 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('roly', { start: 5, end: 6 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'up', frames: this.anims.generateFrameNumbers('roly', { start: 7, end: 9 }), frameRate: 10, repeat: -1 });
    }

    update() {
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.player.anims.play('left', true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            this.player.anims.play('right', true);
        } else if (this.cursors.up.isDown) {
            this.player.setVelocityY(-160);
            this.player.anims.play('up', true);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(160);
            this.player.anims.play('down', true);
        } else {
            this.player.anims.stop();
        }
    }

    collectGem(player, gem) {
        gem.disableBody(true, true);
        this.collectSound.play();
        
        this.score += 1;
        this.scoreText.setText('Gemas: ' + this.score + '/' + this.totalGems);

        if (this.score === this.totalGems) {
            this.endGame('win');
        }
    }

    updateTimer() {
        this.timeLeft -= 1;
        this.timeText.setText('Tiempo: ' + this.timeLeft);

        if (this.timeLeft <= 0) {
            this.endGame('lose');
        }
    }

    endGame(result) {
        this.bgm.stop();
        this.scene.start('GameOverScene', { result: result });
    }
}