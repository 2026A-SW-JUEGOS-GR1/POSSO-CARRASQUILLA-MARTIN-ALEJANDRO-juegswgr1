class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }

    create() {
        this.add.text(400, 200, 'KILLING TIME', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
        this.add.text(400, 300, 'Selecciona un Escenario:', { fontSize: '24px', fill: '#aaa' }).setOrigin(0.5);

        // Botón Escenario 1
        // const btnLevel1 = this.add.text(400, 380, '[ 1. Antigua Roma ]', { fontSize: '32px', fill: '#0f0' })
        //     .setOrigin(0.5)
        //     .setInteractive()
        //     .on('pointerdown', () => this.scene.start('Level1'));
        const btnLevel2 = this.add.text(400, 380, '[ 2. Antiguo Egipto ]', { fontSize: '32px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('Level2'));
        // const btnLevel3 = this.add.text(400, 380, '[ 3. Japón Feudal ]', { fontSize: '32px', fill: '#0f0' })
        //     .setOrigin(0.5)
        //     .setInteractive()
        //     .on('pointerdown', () => this.scene.start('Level3'));

        // Puedes crear botones similares para Level2 y Level3
    }
}