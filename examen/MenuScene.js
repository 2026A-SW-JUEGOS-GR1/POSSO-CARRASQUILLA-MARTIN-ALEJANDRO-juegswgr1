class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Precarga de assets
        this.load.spritesheet('roly', 'assets/roly_spritesheet.png', { frameWidth: 48, frameHeight: 48 });
        // this.load.image('tiles', 'assets/tileset.png');
        this.load.tilemapTiledJSON('map', 'assets/map.json');
        this.load.image('gem', 'assets/gem.png');
        
        this.load.audio('bgm', 'assets/bgm_music.mp3');
        this.load.audio('collect', 'assets/collect_sfx.wav');
        this.load.audio('win', 'assets/win_sfx.wav');
        this.load.audio('lose', 'assets/lose_sfx.wav');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Título principal
        this.add.text(width / 2, height / 2 - 120, 'EL LABERINTO DE ROLY', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
        // Opciones del Menú de Inicio
        this.add.text(width / 2, height / 2 - 20, 'Presiona [ESPACIO] para iniciar partida', { fontSize: '20px', fill: '#0f0' }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 30, 'Presiona [C] para ver el Contexto', { fontSize: '20px', fill: '#0af' }).setOrigin(0.5);
        
        // Reglas al fondo
        this.add.text(width / 2, height / 2 + 110, 'Reglas: Recolecta todas las gemas esparcidas\nen el laberinto antes de que se agote el tiempo.', { fontSize: '15px', fill: '#aaa', align: 'center' }).setOrigin(0.5);

        // Evento para iniciar el juego
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('GameScene');
        });

        // Evento para ir a la pantalla de historia
        this.input.keyboard.on('keydown-C', () => {
            this.scene.start('ContextScene');
        });
    }
}