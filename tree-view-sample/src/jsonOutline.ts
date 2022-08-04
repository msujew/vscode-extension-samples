import * as vscode from 'vscode';
import * as json from 'jsonc-parser';
import * as path from 'path';

const icons: string[] = [
	"accounts-view-bar-icon",
	"breakpoints-activate",
	"breakpoints-remove-all",
	"breakpoints-view-icon",
	"callhierarchy-incoming",
	"callhierarchy-outgoing",
	"callstack-view-icon",
	"callstack-view-session",
	"comments-view-icon",
	"debug-collapse-all",
	"debug-configure",
	"debug-console",
	"debug-console-clear-all",
	"debug-console-evaluation-input",
	"debug-console-evaluation-prompt",
	"debug-console-view-icon",
	"debug-gripper",
	"default-view-icon",
	"diff-editor-next-change",
	"diff-editor-previous-change",
	"diff-editor-toggle-whitespace",
	"diff-insert",
	"diff-remove",
	"diff-review-close",
	"diff-review-insert",
	"diff-review-remove",
	"explorer-view-icon",
	"extensions-clear-search-results",
	"extensions-configure-recommended",
	"extensions-filter",
	"extensions-info-message",
	"extensions-install-count",
	"extensions-install-local-in-remote",
	"extensions-install-workspace-recommended",
	"extensions-manage",
	"extensions-rating",
	"extensions-refresh",
	"extensions-remote",
	"extensions-star-empty",
	"extensions-star-full",
	"extensions-star-half",
	"extensions-sync-enabled",
	"extensions-sync-ignored",
	"extensions-view-icon",
	"extensions-warning-message",
	"find-collapsed",
	"find-expanded",
	"find-next-match",
	"find-previous-match",
	"find-replace",
	"find-replace-all",
	"find-selection",
	"folding-collapsed",
	"folding-expanded",
	"getting-started-beginner",
	"getting-started-codespaces",
	"getting-started-item-checked",
	"getting-started-item-unchecked",
	"getting-started-setup",
	"goto-next-location",
	"goto-previous-location",
	"keybindings-add",
	"keybindings-edit",
	"keybindings-record-keys",
	"keybindings-sort",
	"loaded-scripts-view-icon",
	"marker-navigation-next",
	"marker-navigation-previous",
	"markers-view-filter",
	"markers-view-icon",
	"markers-view-multi-line-collapsed",
	"markers-view-multi-line-expanded",
	"notebook-clear",
	"notebook-collapsed",
	"notebook-delete-cell",
	"notebook-edit",
	"notebook-execute",
	"notebook-execute-all",
	"notebook-expanded",
	"notebook-kernel-configure",
	"notebook-kernel-select",
	"notebook-mimetype",
	"notebook-move-down",
	"notebook-move-up",
	"notebook-open-as-text",
	"notebook-render-output",
	"notebook-revert",
	"notebook-split-cell",
	"notebook-state-error",
	"notebook-state-success",
	"notebook-stop",
	"notebook-stop-edit",
	"notebook-unfold",
	"notifications-clear",
	"notifications-clear-all",
	"notifications-collapse",
	"notifications-configure",
	"notifications-expand",
	"notifications-hide",
	"open-editors-view-icon",
	"outline-view-icon",
	"output-view-icon",
	"panel-close",
	"panel-maximize",
	"panel-restore",
	"parameter-hints-next",
	"parameter-hints-previous",
	"ports-forward-icon",
	"ports-open-browser-icon",
	"ports-stop-forward-icon",
	"ports-view-icon",
	"preferences-clear-input",
	"preferences-open-settings",
	"private-ports-view-icon",
	"public-ports-view-icon",
	"refactor-preview-view-icon",
	"remote-explorer-documentation",
	"remote-explorer-feedback",
	"remote-explorer-get-started",
	"remote-explorer-report-issues",
	"remote-explorer-review-issues",
	"remote-explorer-view-icon",
	"review-comment-collapse",
	"run-view-icon",
	"search-clear-results",
	"search-collapse-results",
	"search-details",
	"search-expand-results",
	"search-hide-replace",
	"search-new-editor",
	"search-refresh",
	"search-remove",
	"search-replace",
	"search-replace-all",
	"search-show-context",
	"search-show-replace",
	"search-stop",
	"search-view-icon",
	"settings-add",
	"settings-discard",
	"settings-edit",
	"settings-folder-dropdown",
	"settings-group-collapsed",
	"settings-group-expanded",
	"settings-more-action",
	"settings-remove",
	"settings-sync-view-icon",
	"settings-view-bar-icon",
	"source-control-view-icon",
	"suggest-more-info",
	"tasks-list-configure",
	"tasks-remove",
	"terminal-kill",
	"terminal-new",
	"terminal-rename",
	"terminal-view-icon",
	"test-view-icon",
	"testing-cancel-icon",
	"testing-debug-icon",
	"testing-error-icon",
	"testing-failed-icon",
	"testing-passed-icon",
	"testing-queued-icon",
	"testing-run-all-icon",
	"testing-run-icon",
	"testing-show-as-list-icon",
	"testing-skipped-icon",
	"testing-unset-icon",
	"timeline-open",
	"timeline-pin",
	"timeline-refresh",
	"timeline-unpin",
	"timeline-view-icon",
	"variables-view-icon",
	"view-pane-container-collapsed",
	"view-pane-container-expanded",
	"watch-expressions-add",
	"watch-expressions-add-function-breakpoint",
	"watch-expressions-remove-all",
	"watch-view-icon",
	"widget-close"
];

export class JsonOutlineProvider implements vscode.TreeDataProvider<number> {

	private _onDidChangeTreeData: vscode.EventEmitter<number | null> = new vscode.EventEmitter<number | null>();
	readonly onDidChangeTreeData: vscode.Event<number | null> = this._onDidChangeTreeData.event;

	private tree: json.Node;
	private text: string;
	private editor: vscode.TextEditor;
	private autoRefresh = true;

	constructor(private context: vscode.ExtensionContext) {
		vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
		vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));
		this.autoRefresh = vscode.workspace.getConfiguration('jsonOutline').get('autorefresh');
		vscode.workspace.onDidChangeConfiguration(() => {
			this.autoRefresh = vscode.workspace.getConfiguration('jsonOutline').get('autorefresh');
		});
		this.onActiveEditorChanged();
	}

	refresh(offset?: number): void {
		this.parseTree();
		if (offset) {
			this._onDidChangeTreeData.fire(offset);
		} else {
			this._onDidChangeTreeData.fire(undefined);
		}
	}

	rename(offset: number): void {
		vscode.window.showInputBox({ placeHolder: 'Enter the new label' })
			.then(value => {
				if (value !== null && value !== undefined) {
					this.editor.edit(editBuilder => {
						const path = json.getLocation(this.text, offset).path;
						let propertyNode = json.findNodeAtLocation(this.tree, path);
						if (propertyNode.parent.type !== 'array') {
							propertyNode = propertyNode.parent.children[0];
						}
						const range = new vscode.Range(this.editor.document.positionAt(propertyNode.offset), this.editor.document.positionAt(propertyNode.offset + propertyNode.length));
						editBuilder.replace(range, `"${value}"`);
						setTimeout(() => {
							this.parseTree();
							this.refresh(offset);
						}, 100);
					});
				}
			});
	}

	private onActiveEditorChanged(): void {
		if (vscode.window.activeTextEditor) {
			if (vscode.window.activeTextEditor.document.uri.scheme === 'file') {
				const enabled = vscode.window.activeTextEditor.document.languageId === 'json' || vscode.window.activeTextEditor.document.languageId === 'jsonc';
				vscode.commands.executeCommand('setContext', 'jsonOutlineEnabled', enabled);
				if (enabled) {
					this.refresh();
				}
			}
		} else {
			vscode.commands.executeCommand('setContext', 'jsonOutlineEnabled', false);
		}
	}

	private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
		if (this.autoRefresh && changeEvent.document.uri.toString() === this.editor.document.uri.toString()) {
			for (const change of changeEvent.contentChanges) {
				const path = json.getLocation(this.text, this.editor.document.offsetAt(change.range.start)).path;
				path.pop();
				const node = path.length ? json.findNodeAtLocation(this.tree, path) : void 0;
				this.parseTree();
				this._onDidChangeTreeData.fire(node ? node.offset : void 0);
			}
		}
	}

	private parseTree(): void {
		this.text = '';
		this.tree = null;
		this.editor = vscode.window.activeTextEditor;
		if (this.editor && this.editor.document) {
			this.text = this.editor.document.getText();
			this.tree = json.parseTree(this.text);
		}
	}

	getChildren(offset?: number): Thenable<number[]> {
		if (offset) {
			const path = json.getLocation(this.text, offset).path;
			const node = json.findNodeAtLocation(this.tree, path);
			return Promise.resolve(this.getChildrenOffsets(node));
		} else {
			return Promise.resolve(this.tree ? this.getChildrenOffsets(this.tree) : []);
		}
	}

	private getChildrenOffsets(node: json.Node): number[] {
		const offsets: number[] = [];
		for (const child of node.children) {
			const childPath = json.getLocation(this.text, child.offset).path;
			const childNode = json.findNodeAtLocation(this.tree, childPath);
			if (childNode) {
				offsets.push(childNode.offset);
			}
		}
		return offsets;
	}

	getTreeItem(offset: number): vscode.TreeItem {
		const path = json.getLocation(this.text, offset).path;
		const valueNode = json.findNodeAtLocation(this.tree, path);
		if (valueNode) {
			const hasChildren = valueNode.type === 'object' || valueNode.type === 'array';
			const treeItem: vscode.TreeItem = new vscode.TreeItem(this.getLabel(valueNode), hasChildren ? valueNode.type === 'object' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
			treeItem.command = {
				command: 'extension.openJsonSelection',
				title: '',
				arguments: [new vscode.Range(this.editor.document.positionAt(valueNode.offset), this.editor.document.positionAt(valueNode.offset + valueNode.length))]
			};
			const random = Math.floor(Math.random() * icons.length);
			treeItem.iconPath = new vscode.ThemeIcon(icons[random]);
			treeItem.contextValue = valueNode.type;
			return treeItem;
		}
		return null;
	}

	select(range: vscode.Range) {
		this.editor.selection = new vscode.Selection(range.start, range.end);
	}

	private getIcon(node: json.Node): any {
		const nodeType = node.type;
		if (nodeType === 'boolean') {
			return {
				light: this.context.asAbsolutePath(path.join('resources', 'light', 'boolean.svg')),
				dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'boolean.svg'))
			};
		}
		if (nodeType === 'string') {
			return {
				light: this.context.asAbsolutePath(path.join('resources', 'light', 'string.svg')),
				dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'string.svg'))
			};
		}
		if (nodeType === 'number') {
			return {
				light: this.context.asAbsolutePath(path.join('resources', 'light', 'number.svg')),
				dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'number.svg'))
			};
		}
		return null;
	}

	private getLabel(node: json.Node): string {
		if (node.parent.type === 'array') {
			const prefix = node.parent.children.indexOf(node).toString();
			if (node.type === 'object') {
				return prefix + ':{ }';
			}
			if (node.type === 'array') {
				return prefix + ':[ ]';
			}
			return prefix + ':' + node.value.toString();
		}
		else {
			const property = node.parent.children[0].value.toString();
			if (node.type === 'array' || node.type === 'object') {
				if (node.type === 'object') {
					return '{ } ' + property;
				}
				if (node.type === 'array') {
					return '[ ] ' + property;
				}
			}
			const value = this.editor.document.getText(new vscode.Range(this.editor.document.positionAt(node.offset), this.editor.document.positionAt(node.offset + node.length)));
			return `${property}: ${value}`;
		}
	}
}
