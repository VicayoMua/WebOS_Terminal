import {
    Terminal,
    FitAddon,
    SerializeAddon,
    // JSZip,
    getISOTimeString,
    randomInt,
    utf8Decoder,
    utf8Encoder,
    legalFileSystemKeyNameRegExp,
    legalFileSerialRegExp,
    SerialLake,
    File,
    Folder,
    extractDirAndKeyName,
    TerminalFolderPointer,
    CommandInputHandler,
    MinimizedWindowRecords,
    TerminalCore
} from './terminal_core.js';

document.addEventListener('DOMContentLoaded', () => {
    class TerminalTabRecord {
        /** @type {HTMLDivElement} */
        divTerminalTab;
        /** @type {HTMLButtonElement} */
        buttonTerminalViewSwitch;
        /** @type {TerminalCore} */
        terminalCore;

        /**
         * @param {HTMLDivElement} divTerminalTab
         * @param {HTMLButtonElement} buttonTerminalViewSwitch
         * @param {TerminalCore} terminalCore
         * */
        constructor(divTerminalTab, buttonTerminalViewSwitch, terminalCore) {
            this.divTerminalTab = divTerminalTab;
            this.buttonTerminalViewSwitch = buttonTerminalViewSwitch;
            this.terminalCore = terminalCore;
        }
    }

    const
        /** @type {number} */
        MAX_TAB_COUNT = 40,
        /** @type {Object} */
        XTermSetup = {
            fontFamily: '"Fira Code", monospace',
            cursorBlink: true,
            allowProposedApi: true,
            theme: {
                foreground: '#f1f1f0',
                background: 'black',
                selection: '#97979b33',
                black: '#282a36',
                brightBlack: '#686868',
                red: '#ff5c57',
                brightRed: '#ff5c57',
                green: '#5af78e',
                brightGreen: '#5af78e',
                yellow: '#f3f99d',
                brightYellow: '#f3f99d',
                blue: '#57c7ff',
                brightBlue: '#57c7ff',
                magenta: '#ff6ac1',
                brightMagenta: '#ff6ac1',
                cyan: '#9aedfe',
                brightCyan: '#9aedfe',
                white: '#f1f1f0',
                brightWhite: '#eff0eb'
            },
        };
    let
        /** @type {number} */
        tabCount = 0, // Initialize the total tab count
        /** @type {TerminalTabRecord | null} */
        currentTerminalTabRecord = null;
    const
        /** @type {Folder} */
        fsRoot = new Folder(true), // Initialize File System Root
        /** @type {string} */
        serialMusk = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789',
        /** @type {SerialLake} */
        serialLake = new SerialLake(() => {
            const serialLen = Math.floor(Math.random() * 3968) + 129; // 4096-128=3968, <serialLen> is within [129,4096]
            let str = '';
            str += serialMusk[randomInt(0, 52)];
            for (let i = 1; i < serialLen; i++) // i = 1 to serialLen-1
                str += serialMusk[randomInt(0, 62)];
            return str;
        }),
        /** @type {TerminalTabRecord[]} */
        terminalTabRecords = [],
        /** @type {Record<string, {is_async: boolean, executable: function(string[]):void, description: string}>} */
        supportedCommands = {}; // Initialize Supported Commands

    const
        button_to_switch_theme = document.getElementById('button_to_switch_theme'),
        div_terminal_tabs = document.getElementById('terminal-tabs'),
        nav_view_navigation = document.getElementById('view-navigation'),
        button_to_open_new_terminal_tab = document.getElementById('button_to_open_new_terminal_tab'),
        button_to_save_terminal_log = document.getElementById('button_to_save_terminal_log'),
        button_to_add_files_to_terminal = document.getElementById('button_to_add_files_to_terminal');

    // Set Up Button Functions Links
    button_to_switch_theme.addEventListener('click', () => {
        button_to_switch_theme.innerText = document.body.classList.toggle('dark-body-mode') ? '☀️' : '🌙';
    });
    button_to_open_new_terminal_tab.addEventListener('click', () => {
        // check the tab count limit
        if (tabCount >= MAX_TAB_COUNT) {
            alert(`You can open at most ${MAX_TAB_COUNT} terminal tabs.`);
            return;
        }
        // record the total tab count & use it as current tab number
        tabCount++;
        // create a new <HTMLDivElement> for the new Terminal
        const divNewTerminalTab = document.createElement('div');
        divNewTerminalTab.setAttribute('class', 'terminal-tab');
        divNewTerminalTab.setAttribute('id', `terminal-tab-${tabCount}`);
        div_terminal_tabs.appendChild(divNewTerminalTab);
        const newTerminalCore = new TerminalCore(
            new Terminal(XTermSetup),
            divNewTerminalTab,
            fsRoot,
            supportedCommands
        );
        // create a new <HTMLButtonElement> for the view switch for the new terminal core
        const buttonNewTerminalViewSwitch = document.createElement('button');
        buttonNewTerminalViewSwitch.type = 'button';
        buttonNewTerminalViewSwitch.textContent = `Tab #${tabCount}`;
        nav_view_navigation.appendChild(buttonNewTerminalViewSwitch);
        // create a new tab record
        const newTerminalTabRecord = new TerminalTabRecord(
            divNewTerminalTab,
            buttonNewTerminalViewSwitch,
            newTerminalCore
        );
        buttonNewTerminalViewSwitch.addEventListener('click', () => {
            if (currentTerminalTabRecord === null || currentTerminalTabRecord !== newTerminalTabRecord) { // make sure the switch is necessary
                // change the nav button style and the terminal tab view
                terminalTabRecords.forEach((tabRecord) => {
                    tabRecord.divTerminalTab.classList.remove('current-tab');
                    tabRecord.buttonTerminalViewSwitch.classList.remove('current-tab');
                });
                divNewTerminalTab.classList.add('current-tab');
                buttonNewTerminalViewSwitch.classList.add('current-tab');
                // switch the terminal tab record
                currentTerminalTabRecord = newTerminalTabRecord;
            }
            setTimeout(() => {
                const fitAddon = newTerminalCore.getFitAddon();
                if (fitAddon !== null) fitAddon.fit();
            }, 100);
        });
        terminalTabRecords.push(newTerminalTabRecord);
        if (currentTerminalTabRecord === null) // if newly-created terminal tab is <Tab #1>
            buttonNewTerminalViewSwitch.click();
        window.addEventListener('resize', () => {
            const fitAddon = newTerminalCore.getFitAddon();
            if (fitAddon !== null)
                fitAddon.fit();
        });
    });
    button_to_save_terminal_log.addEventListener('click', () => {
        const
            url = URL.createObjectURL(new Blob([currentTerminalTabRecord.terminalCore.getTerminalLogAsString()], {type: 'text/plain'})),
            link = document.createElement('a');
        link.href = url;
        link.download = `terminal_log @ ${getISOTimeString()}.txt`; // the filename the user will get
        link.click();
        URL.revokeObjectURL(url);
    });
    button_to_add_files_to_terminal.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '';
        input.multiple = true;
        // set up the file input element
        input.addEventListener('change', (input_event) => {
            if (input_event.target === undefined || input_event.target.files === undefined)
                return;
            for (const file of input_event.target.files) {
                if (!file) continue;
                if (typeof file.name !== 'string') { // filename is illegal
                    alert('button_to_add_files_to_terminal: file name must be a string.');
                    return;
                }
                const reader = new FileReader();
                {
                    // set up behaviors on errors
                    reader.onerror = (error) => {
                        alert(`button_to_add_files_to_terminal: error reading the file "${file.name}". (${error})`);
                    };
                    // set up behaviors on loading
                    reader.onload = (reader_event) => {
                        const fileContent = reader_event.target.result;
                        if (typeof fileContent !== 'string' && !(fileContent instanceof ArrayBuffer)) {
                            alert(`button_to_add_files_to_terminal: unexpected error when loading "${file.name}".`);
                            return;
                        }
                        const [newFile, _] = currentTerminalTabRecord.terminalCore
                            .getCurrentFolderPointer()
                            .getCurrentFolder()
                            .createFile(true, file.name, serialLake.generateNext());
                        if (typeof fileContent === 'string') {
                            newFile.setContent(utf8Encoder.encode(fileContent).buffer, false);
                        } else if (fileContent instanceof ArrayBuffer) {
                            newFile.setContent(fileContent, false);
                        }
                    };
                }
                // Check the file type to determine HOW to read it
                if (typeof file.type === 'string' && file.type.startsWith('text/')) {
                    // Read as text if the file is a text-based file
                    reader.readAsText(file);
                } else {
                    // Read as binary (ArrayBuffer) for non-text files (e.g., images)
                    reader.readAsArrayBuffer(file);  // For binary files (e.g., images)
                }
            }
            alert(`Successfully added ${input_event.target.files.length} file(s) to the current directory.`);
        });
        // activate the file input element
        input.click();
    });

    // Automatically Open Window #1
    for (let i = 0; i < 20; i++) button_to_open_new_terminal_tab.click();

    // Finished
    supportedCommands['hello'] = {
        is_async: false,
        executable: (_) => {
            currentTerminalTabRecord.terminalCore.printToWindow(`Hello World!`, false);
        },
        description: `Say 'Hello World!'`
    };

    // Finished
    supportedCommands['help'] = {
        is_async: false,
        executable: (_) => {
            currentTerminalTabRecord.terminalCore.printToWindow(
                `This terminal supports: ${
                    Object.keys(supportedCommands).reduce(
                        (acc, elem, index) => {
                            if (index === 0) return `\n     ${elem}`;
                            return (index % 6 === 0) ? `${acc},\n     ${elem}` : `${acc}, ${elem}`;
                        },
                        null
                    )
                }.\nFor more details, please use the command 'man [command_name]'.`,
                false
            );
        },
        description: 'A brief manual of the terminal simulator.',
    };

    // Finished
    supportedCommands['man'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                const
                    commandName = parameters[0],
                    commandObject = supportedCommands[commandName];
                if (commandObject === undefined) {
                    currentTerminalTabRecord.terminalCore.printToWindow(
                        `The command '${commandName}' is not supported!`,
                        true
                    );
                } else {
                    currentTerminalTabRecord.terminalCore.printToWindow(
                        commandObject.description,
                        false
                    );
                }
                return;
            }
            currentTerminalTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: man [command_name]`, false);
        },
        description: 'A detailed manual of the terminal simulator.\n' +
            'Usage: man [command_name]',
    };

    // Finished
    supportedCommands['echo'] = {
        is_async: false,
        executable: (parameters) => {
            const result = parameters.reduce(
                (acc, elem, index) => {
                    if (index === 0) return elem;
                    return `${acc} ${elem}`;
                },
                ''
            );
            currentTerminalTabRecord.terminalCore.printToWindow(
                result.length > 0 ? result : `''`,
                false
            );
        },
        description: 'Simply print all the parameters.\n' +
            'Usage: echo [parameters]',
    };

    // Finished
    supportedCommands['touch'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    currentTerminalTabRecord.terminalCore.getCurrentFolderPointer().getCurrentFolder().createFile(false, parameters[0], serialLake.generateNext());
                    currentTerminalTabRecord.terminalCore.printToWindow(`Successfully create a file.`, false);
                } catch (error) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                }
                return;
            }
            currentTerminalTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: touch [file_name]`, false);
        },
        description: 'Make a new file in the current directory.\n' +
            'Usage: touch [file_name]'
    };

    // Finished
    supportedCommands['mkdir'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    currentTerminalTabRecord.terminalCore.getCurrentFolderPointer().createPath(parameters[0], false);
                    currentTerminalTabRecord.terminalCore.printToWindow(
                        `Successfully created a directory. (Note that the directory may be already existing!)`,
                        false
                    );
                } catch (error) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                }
                return;
            }
            currentTerminalTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: mkdir [folder_path]`, false);
        },
        description: 'Make a new directory.\n' +
            'Usage: mkdir [folder_path]'
    };

    // Finished
    supportedCommands['ls'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 0) {
                currentTerminalTabRecord.terminalCore.printToWindow(
                    currentTerminalTabRecord.terminalCore.getCurrentFolderPointer().getCurrentFolder().getContentListAsString(),
                    false
                );
                return;
            }
            if (parameters.length === 1) {
                try {
                    currentTerminalTabRecord.terminalCore.printToWindow(
                        currentTerminalTabRecord.terminalCore.getCurrentFolderPointer().duplicate().gotoPath(parameters[0]).getContentListAsString(),
                        false
                    );
                } catch (error) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                }
                return;
            }
            currentTerminalTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: ls [folder_path]`, false);
        },
        description: 'List all the folders and files.\n' +
            'Usage: ls [folder_path]'
    };

    // Finished
    supportedCommands['cd'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    currentTerminalTabRecord.terminalCore.getCurrentFolderPointer().gotoPath(parameters[0]);
                    currentTerminalTabRecord.terminalCore.printToWindow(`Successfully went to the directory.`, false);
                } catch (error) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                }
                return;
            }
            currentTerminalTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: cd [folder_path]`, false);
        },
        description: 'Goto the given folder.\n' +
            'Usage: cd [folder_path]'
    };

    // Finished
    supportedCommands['pwd'] = {
        is_async: false,
        executable: (_) => {
            currentTerminalTabRecord.terminalCore.printToWindow(
                currentTerminalTabRecord.terminalCore.getCurrentFolderPointer().getFullPath(),
                false
            );
        },
        description: 'Print the current full path.'
    };

    // Finished
    supportedCommands['mv'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 3) {
                const cfp = currentTerminalTabRecord.terminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') {
                    try {
                        cfp.movePath('file', parameters[1], parameters[2]);
                        currentTerminalTabRecord.terminalCore.printToWindow(`Successfully moved the file.`, false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        cfp.movePath('directory', parameters[1], parameters[2]);
                        currentTerminalTabRecord.terminalCore.printToWindow(`Successfully moved the directory.`, false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
            }
            currentTerminalTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: mv -f [original_file_path] [destination_file_path]\n' +
                '       mv -d [original_directory_path] [destination_directory_path]',
                false
            );
        },
        description: 'mv an existing file or directory.\n' +
            'Usage: mv -f [original_file_path] [destination_file_path]\n' +
            '       mv -d [original_directory_path] [destination_directory_path]'
    };

    // Finished
    supportedCommands['cp'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 3) {
                const cfp = currentTerminalTabRecord.terminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') {
                    try {
                        cfp.copyPath('file', parameters[1], parameters[2], serialLake);
                        currentTerminalTabRecord.terminalCore.printToWindow(`Successfully copied the file.`, false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        cfp.copyPath('directory', parameters[1], parameters[2], serialLake);
                        currentTerminalTabRecord.terminalCore.printToWindow(`Successfully copied the directory.`, false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
            }
            currentTerminalTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: cp -f [original_file_path] [destination_file_path]\n' +
                '       cp -d [original_directory_path] [destination_directory_path]',
                false
            );
        },
        description: 'Copy an existing file or directory.\n' +
            'Usage: cp -f [original_file_path] [destination_file_path]\n' +
            '       cp -d [original_directory_path] [destination_directory_path]'
    };

    // Finished
    supportedCommands['rm'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 2) {
                const cfp = currentTerminalTabRecord.terminalCore.getCurrentFolderPointer();
                if (parameters[0] === '-f') {
                    try {
                        cfp.deletePath('file', parameters[1]);
                        currentTerminalTabRecord.terminalCore.printToWindow(`Successfully removed the file.`, false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        cfp.deletePath('directory', parameters[1]);
                        currentTerminalTabRecord.terminalCore.printToWindow(`Successfully removed the directory.`, false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
            }
            currentTerminalTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: rm -f [file_path]\n' +
                '       rm -d [directory_path]',
                false
            );
        },
        description: 'Remove (delete) an existing file or directory.\n' +
            'Usage: rm -f [file_path]\n' +
            '       rm -d [directory_path]'
    };

    // Finished
    supportedCommands['fprint'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    const
                        [fileDir, fileName] = extractDirAndKeyName(parameters[0]),
                        fileContent = currentTerminalTabRecord.terminalCore.getCurrentFolderPointer().duplicate().gotoPath(fileDir).getFile(fileName).getContent();
                    currentTerminalTabRecord.terminalCore.printToWindow(utf8Decoder.decode(fileContent), false, 'green');
                } catch (error) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                }
                return;
            }
            currentTerminalTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: fprint [file_path]',
                false
            );
        },
        description: 'Print an existing file to the terminal window.\n' +
            'Usage: fprint [file_path]'
    };

    /**
     * This function sets up the editor window for the <edit> command.
     * @param {HTMLDivElement} terminalWindowTab
     * @param {string} fileName
     * @param {string} orginalFileContent
     * @param {function(windowDescription: string, divAceEditorWindow:HTMLDivElement, aceEditorObject: Object): void} callbackToRecoverMinimizedWindow
     * @param {function(newFileContent: string): void} callbackToSaveFile
     * @param {function():void} callbackToCancelEdit
     * @returns {void}
     * */
    function openFileEditor(
        terminalWindowTab,
        fileName, orginalFileContent,
        callbackToRecoverMinimizedWindow, callbackToSaveFile, callbackToCancelEdit
    ) {
        const divAceEditorWindow = document.createElement('div');
        divAceEditorWindow.classList.add('ace-editor-window');
        {
            // the title of the editor window
            const h3Title = document.createElement('h3');
            h3Title.classList.add('ace-editor-title');
            h3Title.innerText = `Editing File: ${fileName}`;
            divAceEditorWindow.appendChild(h3Title);

            // Ace-Editor container
            const divAceEditorContainer = document.createElement('div');
            divAceEditorContainer.classList.add('ace-editor-container');
            const aceEditorObject = ace.edit(divAceEditorContainer, { // create Ace editor in the div container
                // mode: "ace/mode/javascript",
                // selectionStyle: "text"
            });
            aceEditorObject.setValue(orginalFileContent);  // set the initial content of the file
            aceEditorObject.setOptions({
                fontSize: "14px",   // set font size
                showPrintMargin: false, // disable the print margin
            });
            aceEditorObject.focus();
            divAceEditorWindow.appendChild(divAceEditorContainer);

            // exit buttons container
            const divExitButtons = document.createElement('div');
            divExitButtons.classList.add('ace-editor-exit-buttons-container');
            {
                // minimize button
                const minimizeButton = document.createElement('button');
                minimizeButton.classList.add('ace-editor-minimize-button');
                minimizeButton.innerText = `🔽 Minimize`;
                minimizeButton.addEventListener('click', () => {
                    callbackToRecoverMinimizedWindow(`Editing File: ${fileName}`, divAceEditorWindow, aceEditorObject); // giving out info to recover the window
                    divAceEditorWindow.style.display = 'none'; // hide but not remove
                });
                divExitButtons.appendChild(minimizeButton);

                // save button
                const saveButton = document.createElement('button');
                saveButton.classList.add('ace-editor-save-button');
                saveButton.innerText = '💾 Save';
                saveButton.addEventListener('click', () => {
                    callbackToSaveFile(aceEditorObject.getValue());
                    divAceEditorWindow.remove();
                });
                divExitButtons.appendChild(saveButton);

                // cancel button
                const cancelButton = document.createElement('button');
                cancelButton.classList.add('ace-editor-cancel-button');
                cancelButton.innerText = '✖ Cancel';
                cancelButton.addEventListener('click', () => {
                    callbackToCancelEdit();
                    divAceEditorWindow.remove();
                });
                divExitButtons.appendChild(cancelButton);
            }
            divAceEditorWindow.appendChild(divExitButtons);
        }
        terminalWindowTab.appendChild(divAceEditorWindow);
    }

    // Finished
    supportedCommands['edit'] = {
        is_async: false,
        executable: (parameters) => {
            const emptyKBL = (_) => undefined; // empty keyboard listener
            if (parameters.length === 1) {
                try {
                    const
                        [fileDir, fileName] = extractDirAndKeyName(parameters[0]),
                        file = currentTerminalTabRecord.terminalCore
                            .getCurrentFolderPointer()
                            .duplicate()
                            .gotoPath(fileDir)
                            .getFile(fileName),
                        fileContent = file.getContent();
                    currentTerminalTabRecord.terminalCore.setNewKeyboardListener(emptyKBL);
                    openFileEditor(
                        currentTerminalTabRecord.terminalCore.getWindowTab(),
                        fileName,
                        utf8Decoder.decode(fileContent),
                        (windowDescription, divAceEditorWindow, aceEditorObject) => { // minimize
                            const cmwr = currentTerminalTabRecord.terminalCore.getMinimizedWindowRecords();
                            cmwr.add(windowDescription, () => {
                                currentTerminalTabRecord.terminalCore.setNewKeyboardListener(emptyKBL);
                                divAceEditorWindow.style.display = '';
                                aceEditorObject.focus();
                            });
                            currentTerminalTabRecord.terminalCore.setDefaultKeyboardListener();
                        },
                        (newFileContent) => { // save
                            file.setContent(utf8Encoder.encode(newFileContent).buffer, false);
                            currentTerminalTabRecord.terminalCore.setDefaultKeyboardListener();
                        },
                        () => { // cancel
                            currentTerminalTabRecord.terminalCore.setDefaultKeyboardListener();
                        }
                    );
                    currentTerminalTabRecord.terminalCore.printToWindow(`Successfully opened a text editor.`, false);
                } catch (error) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                }
                return;
            }
            currentTerminalTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: edit [file_path]`, false);
        },
        description: 'Edit an existing file.\n' +
            'Usage: edit [file_path]'
    };

    // Finished
    supportedCommands['mini'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1 && parameters[0] === '-l') { // Command: "mini -l"
                const cmwrList = currentTerminalTabRecord.terminalCore.getMinimizedWindowRecords().getList();
                if (cmwrList.length === 0) {
                    currentTerminalTabRecord.terminalCore.printToWindow('No window minimized...', false);
                } else {
                    currentTerminalTabRecord.terminalCore.printToWindow(
                        'Minimized Windows:' + cmwrList.reduce(
                            (acc, [index, description]) =>
                                `${acc}\n                    [${index}] ${description}`,
                            ''
                        ),
                        false
                    );
                }
                return;
            }
            if (parameters.length === 2 && parameters[0] === '-r') { // Command: "mini -r [number]"
                const
                    cmwr = currentTerminalTabRecord.terminalCore.getMinimizedWindowRecords(),
                    result = cmwr.recoverWindow(Number.parseInt(parameters[1], 10));
                if (result === null) {
                    currentTerminalTabRecord.terminalCore.printToWindow('Wrong index!', false);
                } else if (result === true) {
                    currentTerminalTabRecord.terminalCore.printToWindow(
                        'Successfully recovered the window.\n' +
                        'Note: Window indices are refrshed after this operation!',
                        false
                    );
                }
                return;
            }
            currentTerminalTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: mini -l\n' +
                '       mini -r [number]',
                false
            );
        },
        description: 'List all the minimized windows, or Re-open a minimized window.\n' +
            'Usage: mini -l             to list all the minimized windows\n' +
            '       mini -r [number]    to recover the minimized window',
    };

    // Finished
    supportedCommands['download'] = {
        is_async: true,
        executable: async (parameters) => {
            if (parameters.length === 2) {
                const tfp = currentTerminalTabRecord.terminalCore.getCurrentFolderPointer().duplicate();
                if (parameters[0] === '-f') {
                    try {
                        const
                            [fileDir, fileName] = extractDirAndKeyName(parameters[1]),
                            url = URL.createObjectURL(
                                new Blob(
                                    [tfp.gotoPath(fileDir).getFile(fileName).getContent()],
                                    {type: 'application/octet-stream'}
                                )
                            ),
                            link = document.createElement('a');
                        link.href = url;
                        link.download = fileName; // the filename the user sees
                        link.click();
                        URL.revokeObjectURL(url);
                        currentTerminalTabRecord.terminalCore.printToWindow(
                            'Successfully downloaded the file.',
                            false
                        );
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        const
                            url = URL.createObjectURL(await tfp.gotoPath(parameters[1]).getZipBlob()),
                            link = document.createElement('a'),
                            zipFileName = tfp.getFullPath().substring(1).replaceAll('/', '_');
                        link.href = url;
                        link.download = (zipFileName === '') ? 'ROOT.zip' : `ROOT_${zipFileName}.zip`; // the filename the user sees
                        link.click();
                        URL.revokeObjectURL(url);
                        currentTerminalTabRecord.terminalCore.printToWindow(
                            'Successfully downloaded the directory.',
                            false
                        );
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
            }
            currentTerminalTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: download -f [file_path]\n' +
                '       download -d [directory_path]',
                false
            );
        },
        description: 'Download a single file or a directory (as .zip file) in the terminal file system.\n' +
            'Usage: download -f [file_path]\n' +
            '       download -d [directory_path]'
    };

    // Update Needed
    supportedCommands['mycloud'] = {
        is_async: true,
        executable: async (parameters) => {
            if (
                parameters.length === 3 &&
                parameters[0].length > 6 && parameters[0].startsWith('-ipp=') &&  // ip:port
                parameters[1].length > 5 && parameters[1].startsWith('-key=')     // user key
            ) {
                const
                    ipp = parameters[0].substring(5),
                    user_key = parameters[1].substring(5);
                if (parameters[2] === '-new') { // Command: mycloud -ipp=[ip:port] -key=[user_key] -new
                    try {
                        const {connection, error} = await fetch( // {connection, error}
                            `http://${ipp}/mycloud/users/`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify({
                                    aim: 'new_account',
                                    user_key: user_key
                                })
                            }
                        ).then(
                            (res) => res.json()
                        );
                        if (connection !== true) {
                            currentTerminalTabRecord.terminalCore.printToWindow('Bad connection: "responseBody.connection" is not true.', false);
                            return;
                        }
                        if (error !== undefined) { // has error
                            currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                            return;
                        }
                        currentTerminalTabRecord.terminalCore.printToWindow(' --> Successfully registered a user key.', false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[2] === '-conf') { // Command: mycloud -ipp=[ip:port] -key=[user_key] -conf
                    try {
                        const {connection, error, result} = await fetch( // {connection, error, result=true/false}
                            `http://${ipp}/mycloud/users/`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify({
                                    aim: 'conf_account',
                                    user_key: user_key
                                })
                            }
                        ).then(
                            (res) => res.json()
                        );
                        if (connection !== true) {
                            currentTerminalTabRecord.terminalCore.printToWindow('Bad connection: "responseBody.connection" is not true.', false);
                            return;
                        }
                        if (error !== undefined) { // has error
                            currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                            return;
                        }
                        if (result !== true) {
                            currentTerminalTabRecord.terminalCore.printToWindow('The user key does not exist.', false);
                            return;
                        }
                        currentTerminalTabRecord.terminalCore.printToWindow(
                            ' --> The user key is valid.\n' +
                            ' --> Generating the configuration file at /.mycloud_conf.\n'
                            , false
                        );
                        if (fsRoot.hasFile('.mycloud_conf')) { // .mycloud_conf is already existing
                            fsRoot.getFile('.mycloud_conf').setContent(utf8Encoder.encode(`${parameters[0]}\n${parameters[1]}`).buffer, false);
                        } else {
                            const [file, _] = fsRoot.createFile(false, '.mycloud_conf', serialLake.generateNext());
                            file.setContent(utf8Encoder.encode(`${parameters[0]}\n${parameters[1]}`).buffer, false);
                        }
                        currentTerminalTabRecord.terminalCore.printToWindow(
                            ' --> Successfully configured MyCloud Client.',
                            false
                        );
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
            }
            if (parameters.length === 1) {
                // get the configuration file
                if (!fsRoot.hasFile('.mycloud_conf')) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`Fail to load the configuration file at /.mycloud_conf.`, false);
                    return;
                }
                const
                    confFileContent = fsRoot.getFile('.mycloud_conf').getContent(),
                    confContent = utf8Decoder.decode(confFileContent),
                    ippIndex = confContent.indexOf('-ipp='),
                    enterIndex = confContent.indexOf('\n'),
                    keyIndex = confContent.indexOf('-key=');
                // check the configuration file content
                if (
                    ippIndex === -1 || enterIndex === -1 || keyIndex === -1 ||
                    ippIndex + 4 >= enterIndex || enterIndex >= keyIndex || keyIndex + 4 >= confContent.length - 1
                ) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`The configuration file content (/.mycloud_conf) is illegal.`, false);
                    return;
                }
                const
                    ipp = confContent.substring(ippIndex + 5, enterIndex),
                    user_key = confContent.substring(keyIndex + 5);
                // check the content of <ipp> and <user_key>
                if (ipp.length === 0 || user_key.length === 0) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`The configuration file content (/.mycloud_conf) is illegal.`, false);
                    return;
                }
                if (parameters[0] === '-backup') { // Command: mycloud -backup
                    currentTerminalTabRecord.terminalCore.printToWindow(`Backing up the file system to ${ipp} as "${user_key.substring(0, 6)}..".\n`, false);
                    try {
                        const jsonFetches = fsRoot.getFilesAsList().map((file) =>
                            fetch( // {connection, error}
                                `http://${ipp}/mycloud/files/`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        aim: 'backup',
                                        user_key: user_key,
                                        serial: file.getSerial(),
                                        content: file.getContent(),
                                        created_at: file.getCreatedAt(),
                                        updated_at: file.getUpdatedAt()
                                    })
                                }
                            ).then(
                                (res) => res.json()
                            )
                        );
                        jsonFetches.push(
                            fetch( // {connection, error}
                                `http://${ipp}/mycloud/files/`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        aim: 'backup',
                                        user_key: user_key,
                                        serial: 'ROOT',
                                        content: fsRoot.getRecordsJSON(),
                                        created_at: getISOTimeString(),
                                        updated_at: getISOTimeString()
                                    })
                                }
                            ).then(
                                (res) => res.json()
                            )
                        );
                        const settledResults = await Promise.allSettled(jsonFetches);
                        let failure = false;
                        settledResults.forEach((settledResult) => {
                            if (settledResult.status === 'rejected') {
                                currentTerminalTabRecord.terminalCore.printToWindow(`${settledResult.reason}\n`, false);
                                failure = true;
                            } else if (settledResult.status === 'fulfilled') {
                                const {connection, error} = settledResult.value;
                                if (connection !== true) {
                                    currentTerminalTabRecord.terminalCore.printToWindow('Bad connection: "responseBody.connection" is not true.\n', false);
                                    failure = true;
                                } else if (error !== undefined) { // has error
                                    currentTerminalTabRecord.terminalCore.printToWindow(`${error}\n`, false);
                                    failure = true;
                                }
                            }
                        });
                        if (failure) {
                            currentTerminalTabRecord.terminalCore.printToWindow('Failed to back up the file system.', false);
                        } else {
                            currentTerminalTabRecord.terminalCore.printToWindow(' --> Successfully backed up the file system to MyCloud server.', false);
                        }
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[0] === '-recover') { // Command: mycloud -recover
                    currentTerminalTabRecord.terminalCore.printToWindow(`Recovering the file system from ${ipp} as "${user_key.substring(0, 6)}...".\n`, false);
                    try {
                        // get the ROOT map
                        const bodyROOT = await fetch( // {connection=true, error, __serial__IGNORED__, content, __created_at__IGNORED__, __updated_at__IGNORED__}
                            `http://${ipp}/mycloud/files/`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify({
                                    aim: 'recover',
                                    user_key: user_key,
                                    serial: 'ROOT'
                                })
                            }
                        ).then(
                            (res) => res.json()
                        );
                        if (bodyROOT.connection !== true) {
                            currentTerminalTabRecord.terminalCore.printToWindow('Bad connection: "responseBodyROOT.connection" is not true.', false);
                            return;
                        }
                        if (bodyROOT.error !== undefined) {
                            currentTerminalTabRecord.terminalCore.printToWindow(`${bodyROOT.error}`, false);
                            return;
                        }
                        if (typeof bodyROOT.content !== 'string') {
                            currentTerminalTabRecord.terminalCore.printToWindow('The ROOT map is illegal.', false);
                            return;
                        }
                        // check the information in <plainRootFolderObject>
                        const
                            /** @type {Object} */
                            plainRootFolderObject = JSON.parse(bodyROOT.content),
                            /**
                             * This implementation maximizes the compatibility of received JSON.
                             * @param {Object} plainFolderObject
                             * @returns {void}
                             * @throws {TypeError}
                             * */
                            checkPlainFolderObject = (plainFolderObject) => {
                                if (typeof plainFolderObject.subfolders === 'object') { // {name: plainFolderObject}
                                    Object.entries(plainFolderObject.subfolders).forEach(([subfolderName, psfo]) => {
                                        if (typeof subfolderName !== 'string' || !legalFileSystemKeyNameRegExp.test(subfolderName))
                                            throw new TypeError('Subfolder name in the plain folder object must be legal.');
                                        if (typeof psfo !== 'object')
                                            throw new TypeError('Plain subfolder object in the plain folder object must be an object.');
                                        checkPlainFolderObject(psfo);
                                    });
                                }
                                if (typeof plainFolderObject.files === 'object') { // {name: fileSerial}
                                    Object.entries(plainFolderObject.files).forEach(([fileName, fileSerial]) => {
                                        if (typeof fileName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileName))
                                            throw new TypeError('File name in the plain folder object must be legal.');
                                        if (typeof fileSerial !== 'string' || !legalFileSerialRegExp.test(fileSerial))
                                            throw new TypeError('File serial in the plain folder object must be legal.');
                                    });
                                }
                                if (typeof plainFolderObject.created_at === 'string') { // string
                                    if (plainFolderObject.created_at.length === 0)
                                        throw new TypeError('created_at in the plain folder object must be a non-empty string.');
                                }
                                if (typeof plainFolderObject.folderLinks === 'object') { // {name: link}
                                    Object.entries(plainFolderObject.folderLinks).forEach(([folderLinkName, folderLink]) => {
                                        if (typeof folderLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(folderLinkName))
                                            throw new TypeError('Folder link name in the plain folder object must be legal');
                                        if (typeof folderLink !== 'string' || folderLink.length === 0)
                                            throw new TypeError('Folder link in the plain folder object must be a non-empty string.');
                                    });
                                }
                                if (typeof plainFolderObject.fileLinks === 'object') { // {name: link}
                                    Object.entries(plainFolderObject.fileLinks).forEach(([fileLinkName, fileLink]) => {
                                        if (typeof fileLinkName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileLinkName))
                                            throw new TypeError('File link name in the plain folder object must be legal.');
                                        if (typeof fileLink !== 'string' || fileLink.length === 0)
                                            throw new TypeError('File link in the plain folder object must be a non-empty string.');
                                    });
                                }
                            };
                        checkPlainFolderObject(plainRootFolderObject);
                        // get all file serials
                        const
                            /** @type {string[]} */
                            fileSerials = [],
                            /**
                             * This implementation maximizes the compatibility of received JSON.
                             * @param {Object} plainFolderObject
                             * @returns {void}
                             * */
                            getFileSerialsFromPlainFolderObject = (plainFolderObject) => {
                                if (typeof plainFolderObject.subfolders === 'object') {
                                    Object.values(plainFolderObject.subfolders).forEach((psfo) => {
                                        getFileSerialsFromPlainFolderObject(psfo);
                                    });
                                }
                                if (typeof plainFolderObject.files === 'object') {
                                    Object.values(plainFolderObject.files).forEach((fileSerial) => {
                                        fileSerials.push(fileSerial);
                                    });
                                }
                            };
                        getFileSerialsFromPlainFolderObject(plainRootFolderObject);
                        // construct files map
                        const
                            jsonFetches = fileSerials.map((fileSerial) =>
                                fetch( // {connection=true, error, content, created_at, updated_at}
                                    `http://${ipp}/mycloud/files/`,
                                    {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Accept': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            aim: 'recover',
                                            user_key: user_key,
                                            serial: fileSerial
                                        })
                                    }
                                ).then(
                                    (res) => res.json()
                                )
                            ),
                            settledResults = await Promise.allSettled(jsonFetches);
                        let failure = false;
                        /** @type {Record<string, File>} */
                        const
                            filesMap = settledResults.reduce(
                                (acc, settledResult) => {
                                    if (settledResult.status === 'rejected') {
                                        currentTerminalTabRecord.terminalCore.printToWindow(`${settledResult.reason}\n`, false);
                                        failure = true;
                                    } else if (settledResult.status === 'fulfilled') {
                                        const {
                                            connection, error,
                                            serial, content, created_at, updated_at
                                        } = settledResult.value;
                                        if (connection !== true) {
                                            currentTerminalTabRecord.terminalCore.printToWindow('Bad connection: "responseBody.connection" is not true.\n', false);
                                            failure = true;
                                        } else if (error !== undefined) { // has error
                                            currentTerminalTabRecord.terminalCore.printToWindow(`${error}\n`, false);
                                            failure = true;
                                        } else if (
                                            typeof serial !== 'string' || serial.length === 0 ||
                                            typeof content !== 'string' ||
                                            typeof created_at !== 'string' || created_at.length === 0 ||
                                            typeof updated_at !== 'string' || updated_at.length === 0
                                        ) {
                                            currentTerminalTabRecord.terminalCore.printToWindow('A file is illegal.\n', false);
                                            failure = true;
                                        } else {
                                            const uint8 = utf8Encoder.encode(content);
                                            acc[serial] = new File(serial, uint8.buffer, created_at, updated_at);
                                        }
                                    }
                                    return acc;
                                },
                                {}
                            ),
                            /**
                             * This implementation maximizes the compatibility of received JSON.
                             * @param {Object} plainFolderObject
                             * @param {Folder} destFolder
                             * @returns {void}
                             * @throws {TypeError | Error}
                             * */
                            recoverFSRoot = (plainFolderObject, destFolder) => {
                                if (typeof plainFolderObject.subfolders === 'object') { // {name: plainFolderObject}
                                    Object.entries(plainFolderObject.subfolders).forEach(([subfolderName, psfo]) => {
                                        recoverFSRoot(psfo, destFolder.createSubfolder(false, subfolderName));
                                    });
                                }
                                if (typeof plainFolderObject.files === 'object') { // {name: fileSerial}
                                    Object.entries(plainFolderObject.files).forEach(([fileName, fileSerial]) => {
                                        destFolder.createFileDangerous(fileName, filesMap[fileSerial]);
                                    });
                                }
                                if (typeof plainFolderObject.created_at === 'string') { // string
                                    destFolder.setCreatedAt(plainFolderObject.created_at);
                                }
                                if (typeof plainFolderObject.folderLinks === 'object') { // {name: link}
                                    Object.entries(plainFolderObject.folderLinks).forEach(([folderLinkName, folderLink]) => {
                                        destFolder.createFolderLink(folderLinkName, folderLink);
                                    });
                                }
                                if (typeof plainFolderObject.fileLinks === 'object') { // {name: link}
                                    Object.entries(plainFolderObject.fileLinks).forEach((fileLinkName, fileLink) => {
                                        destFolder.createFileLink(fileLinkName, fileLink);
                                    });
                                }
                            };
                        if (failure) {
                            currentTerminalTabRecord.terminalCore.printToWindow('Failed to recover the file system.', false);
                            return;
                        }
                        // recover <serialLake> with <fileSerials>
                        serialLake.recover(fileSerials);
                        // recover fsRoot with <plainRootFolderObject> and <filesMap>
                        recoverFSRoot(plainRootFolderObject, fsRoot.clear());
                        currentTerminalTabRecord.terminalCore.printToWindow(' --> Successfully recovered the file system from MyCloud server.', false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
            }
            currentTerminalTabRecord.terminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: mycloud -ipp=[ip:port] -key=[user_key] -new     to register a new user key on MyCloud server\n' +
                '       mycloud -ipp=[ip:port] -key=[user_key] -conf    to configure MyCloud client (creating file "/.mycloud_conf")\n' +
                '       mycloud -backup                                 to backup the current file system to MyCloud server\n' +
                '       mycloud -recover                                to recover the file system from MyCloud server (overwriting the current file system)\n',
                false
            );
        },
        description: 'Backup and recover the terminal file system to MyCloud server.\n' +
            'Wrong grammar!\n' +
            'Usage: mycloud -ipp=[ip:port] -key=[user_key] -new     to register a new user key on MyCloud server\n' +
            '       mycloud -ipp=[ip:port] -key=[user_key] -conf    to configure MyCloud client (creating file "/.mycloud_conf")\n' +
            '       mycloud -backup                                 to backup the current file system to MyCloud server\n' +
            '       mycloud -recover                                to recover the file system from MyCloud server (overwriting the current file system)\n'
    }

    // // Update Needed
    supportedCommands['ping'] = {
        is_async: true,
        executable: async (parameters) => {
            //
        },
        description: ''
    }

    // // Update Needed
    supportedCommands['wget'] = {
        is_async: true,
        executable: async (parameters) => {
            //
        },
        description: ''
    }

    // // Update Needed
    supportedCommands['zip'] = {
        is_async: true,
        executable: async (parameters) => {
            //
        },
        description: ''
    }

    // // Update Needed
    supportedCommands['unzip'] = {
        is_async: true,
        executable: async (parameters) => {
            //
        },
        description: ''
    }

    supportedCommands['ttt'] = {
        is_async: true,
        executable: async (_) => {
            //
        },
        description: ''
    }

    // // Update Needed
    // supportedCommands['ctow'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }
    //
    //
    // // Update Needed
    // supportedCommands['pytow'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }
    //
    //
    // // Update Needed
    // supportedCommands['wasm'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }

    // supportedCommands[''] = {
    //     executable: (parameters) => {},
    //     description: ''
    // }

});

























