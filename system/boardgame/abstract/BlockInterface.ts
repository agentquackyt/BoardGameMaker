
interface BlocklyDescriptionAI {
    type: string;
    description: string;
    properties: { [key: string]: any };
    actions?: { [key: string]: any };
}

abstract class BlockInterface {
    abstract registerBlocks(): void;
    abstract getDescriptionForAI(): BlocklyDescriptionAI;
}

export { BlockInterface };
export type { BlocklyDescriptionAI };
