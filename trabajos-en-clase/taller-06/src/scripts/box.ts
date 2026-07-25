import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { IScript, visibleAsNumber } from "babylonjs-editor-tools";

export default class SceneComponent implements IScript {
	

	public constructor(public mesh: Mesh) {}

	public onStart(): void {}

	public onUpdate(): void {
	}
}
