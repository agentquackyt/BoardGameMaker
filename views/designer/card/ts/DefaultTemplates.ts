import {
    Card,
    type CardLayoutElement,
    type CardSpecification,
    type CardStyleInterface
} from "../../../../system/boardgame/cards/Card";

type MediaAsset = {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    dataUrl: string;
};

type EditorCardStyle = CardStyleInterface & {
    backgroundMediaId?: string;
};

type EditorLayoutElement = Omit<CardLayoutElement, "style"> & {
    id: string;
    style?: EditorCardStyle;
    contentMediaId?: string;
};

type EditorCardSpecification = Omit<CardSpecification, "front" | "back" | "layout"> & {
    front: EditorCardStyle;
    back: EditorCardStyle;
    layout: EditorLayoutElement[];
};

type EditorTemplate = {
    id: string;
    name: string;
    spec: EditorCardSpecification;
    variables: string[];
};

type EditorDocument = {
    version: 2;
    deckName: string;
    deckUuid: string;
    templates: EditorTemplate[];
    activeTemplateId: string;
    rowTemplateIds: string[];
    rowAmounts: number[];
    sampleRows: Record<string, string>[];
    mediaLibrary: Record<string, MediaAsset>;
};

function createDefaultStyle(textColor = "#111111"): EditorCardStyle {
    return {
        type: "color",
        background: "transparent",
        textColor,
        additionalStyles: {
            "font-size": "5mm",
            "line-height": "1.2"
        }
    };
}

function createDefaultTemplate(name = "Layout 1"): EditorTemplate {
    const spec: EditorCardSpecification = {
        uuid: crypto.randomUUID(),
        width: 63.5,
        height: 88.9,
        front: {
            type: "color",
            background: "#ffffff",
            textColor: "#111111",
            additionalStyles: {
                "font-family": "'Roboto', sans-serif"
            }
        },
        back: {
            type: "color",
            background: "#1f2937",
            textColor: "#ffffff"
        },
        layout: [
            {
                id: crypto.randomUUID(),
                type: "text",
                content: "First Card",
                posX: 6,
                posY: 7,
                width: 51,
                height: 12,
                style: {
                    ...createDefaultStyle("#111111"),
                    additionalStyles: {
                        "font-size": "6.5mm",
                        "font-weight": "700"
                    }
                }
            }
        ]
    };

    return {
        id: crypto.randomUUID(),
        name,
        spec,
        variables: []
    };
}

function createDefaultDocument(): EditorDocument {
    const template = createDefaultTemplate();
    return {
        version: 2,
        deckName: "New Deck",
        deckUuid: crypto.randomUUID(),
        
        templates: [template],
        activeTemplateId: template.id,
        rowTemplateIds: [template.id],
        rowAmounts: [1],
        sampleRows: [
            {}
        ],
        mediaLibrary: {}
    };
}


export {
    createDefaultDocument,
    createDefaultTemplate,
    createDefaultStyle
}
export type {
    EditorCardStyle,
    EditorLayoutElement,
    EditorCardSpecification,
    EditorTemplate,
    EditorDocument,
    MediaAsset
}