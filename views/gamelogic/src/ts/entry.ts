import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

document.addEventListener('DOMContentLoaded', () => {
    document.body.replaceChildren();
    document.body.className = 'blockly-demo-body';

    const app = document.createElement('div');
    app.className = 'blockly-demo-shell';

    const workspacePanel = document.createElement('section');
    workspacePanel.className = 'blockly-demo-panel blockly-demo-panel--workspace';

    const title = document.createElement('div');
    title.className = 'blockly-demo-title';
    const titleHeading = document.createElement('h2');
    titleHeading.className = 'blockly-demo-title__heading';
    titleHeading.textContent = 'Blockly demo';
    const titleText = document.createElement('p');
    titleText.className = 'blockly-demo-title__text';
    titleText.textContent = 'A tiny starter workspace with a live JavaScript preview.';
    title.append(titleHeading, titleText);

    const blocklyDiv = document.createElement('div');
    blocklyDiv.id = 'blocklyDiv';
    blocklyDiv.className = 'blockly-demo-workspace';

    const previewPanel = document.createElement('section');
    previewPanel.className = 'blockly-demo-panel blockly-demo-panel--preview';

    const previewTitle = document.createElement('div');
    previewTitle.className = 'blockly-demo-preview-title';
    const previewHeading = document.createElement('h3');
    previewHeading.className = 'blockly-demo-preview-title__heading';
    previewHeading.textContent = 'Generated code';
    const previewText = document.createElement('p');
    previewText.className = 'blockly-demo-preview-title__text';
    previewText.textContent = 'This updates whenever you edit the blocks.';
    previewTitle.append(previewHeading, previewText);

    const preview = document.createElement('pre');
    preview.className = 'blockly-demo-preview-code';

    workspacePanel.append(title, blocklyDiv);
    previewPanel.append(previewTitle, preview);
    app.append(workspacePanel, previewPanel);
    document.body.append(app);

    const workspace = Blockly.inject(blocklyDiv, {
        toolbox: `
            <xml>
                <block type="controls_if"></block>
                <block type="logic_compare"></block>
                <block type="logic_operation"></block>
                <block type="logic_negate"></block>
                <block type="logic_boolean"></block>
                <block type="logic_null"></block>
                <block type="logic_ternary"></block>
                <block type="math_number"></block>
                <block type="text"></block>
                <block type="text_print"></block>
            </xml>
        `
    });

    const demoXml = `
        <xml xmlns="https://developers.google.com/blockly/xml">
            <block type="controls_if" x="32" y="32">
                <value name="IF0">
                    <block type="logic_compare">
                        <field name="OP">EQ</field>
                        <value name="A">
                            <block type="math_number">
                                <field name="NUM">3</field>
                            </block>
                        </value>
                        <value name="B">
                            <block type="math_number">
                                <field name="NUM">3</field>
                            </block>
                        </value>
                    </block>
                </value>
                <statement name="DO0">
                    <block type="text_print">
                        <value name="TEXT">
                            <block type="text">
                                <field name="TEXT">Blockly demo is ready.</field>
                            </block>
                        </value>
                    </block>
                </statement>
                <statement name="ELSE">
                    <block type="text_print">
                        <value name="TEXT">
                            <block type="text">
                                <field name="TEXT">Try changing one of the numbers.</field>
                            </block>
                        </value>
                    </block>
                </statement>
            </block>
        </xml>
    `;

    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(demoXml), workspace);

    const renderPreview = () => {
        const code = pythonGenerator.workspaceToCode(workspace).trim();
        preview.textContent = code || '// No generated code yet';
    };

    workspace.addChangeListener(renderPreview);
    renderPreview();
    Blockly.svgResize(workspace);

    window.addEventListener('resize', () => Blockly.svgResize(workspace));
});