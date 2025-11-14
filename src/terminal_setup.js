import {
    Terminal,
    FitAddon,
    SerializeAddon,
    // JSZip,
    getISOTimeString,
    randomInt,
    utf8Decoder,
    utf8Encoder,
    formData,
    openFileEditor,
    legalFileSystemKeyNameRegExp,
    legalFileSerialRegExp,
    SerialLake,
    File,
    Folder,
    extractDirAndKeyName,
    TerminalFolderPointer,
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
        _fsRoot_ = new Folder(true), // Initialize File System Root
        /** @type {string} */
        serialMusk = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789',
        /** @type {SerialLake} */
        _serialLake_ = new SerialLake(() => {
            const serialLen = Math.floor(Math.random() * 3968) + 129; // 4096-128=3968, <serialLen> is within [129,4096]
            let str = '';
            str += serialMusk[randomInt(0, 52)];
            for (let i = 1; i < serialLen; i++) // i = 1 to serialLen-1
                str += serialMusk[randomInt(0, 62)];
            return str;
        }),
        /** @type {TerminalTabRecord[]} */
        _terminalTabRecords_ = [],
        /** @type {Record<string, {is_async: boolean, executable: function(string[]):void, description: string}>} */
        _supportedCommands_ = {}; // Initialize Supported Commands

    // Set Up Button Functions Links
    {
        const
            button_to_switch_theme = document.getElementById('button_to_switch_theme'),
            div_terminal_tabs = document.getElementById('terminal-tabs'),
            nav_view_navigation = document.getElementById('view-navigation'),
            button_to_open_new_terminal_tab = document.getElementById('button_to_open_new_terminal_tab'),
            button_to_save_terminal_log = document.getElementById('button_to_save_terminal_log'),
            button_to_add_files_to_terminal = document.getElementById('button_to_add_files_to_terminal'),
            button_to_upload_to_mycloud_server = document.getElementById('button_to_upload_to_mycloud_server');

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
                _fsRoot_,
                _supportedCommands_
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
                    _terminalTabRecords_.forEach((tabRecord) => {
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
            _terminalTabRecords_.push(newTerminalTabRecord);
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
                            alert(`button_to_add_files_to_terminal: error reading the file '${file.name}'. (${error})`);
                        };
                        // set up behaviors on loading
                        reader.onload = (reader_event) => {
                            const fileContent = reader_event.target.result;
                            if (typeof fileContent !== 'string' && !(fileContent instanceof ArrayBuffer)) {
                                alert(`button_to_add_files_to_terminal: unexpected error when loading '${file.name}'.`);
                                return;
                            }
                            const [newFile, _] = currentTerminalTabRecord.terminalCore
                                .getCurrentFolderPointer()
                                .getCurrentFolder()
                                .createFile(true, file.name, _serialLake_.generateNext());
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
        button_to_upload_to_mycloud_server.addEventListener('click', () => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.classList.add('mycloud-popup-overlay');

            // Create a modal input box for IP:Port and User Key
            const modal = document.createElement('div');
            modal.classList.add('mycloud-popup');

            const title = document.createElement('h3');
            title.textContent = 'Upload to MyCloud Server';
            title.classList.add('mycloud-popup-title');
            modal.appendChild(title);

            // IP:Port input container
            const ippInputContainer = document.createElement('div');
            ippInputContainer.classList.add('mycloud-popup-input-container');

            const ippInput = document.createElement('input');
            ippInput.type = 'text';
            ippInput.placeholder = 'IP:Port (e.g., 127.0.0.1:80)';
            ippInput.classList.add('mycloud-popup-input');
            ippInputContainer.appendChild(ippInput);
            modal.appendChild(ippInputContainer);

            // User Key input container
            const userKeyInputContainer = document.createElement('div');
            userKeyInputContainer.classList.add('mycloud-popup-input-container');

            const userKeyInput = document.createElement('input');
            userKeyInput.type = 'text';
            userKeyInput.placeholder = 'User key';
            userKeyInput.classList.add('mycloud-popup-input');
            userKeyInputContainer.appendChild(userKeyInput);
            modal.appendChild(userKeyInputContainer);

            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('mycloud-popup-button-container');

            // Helper function will be defined after overlay is created
            let closeModal;

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.classList.add('mycloud-popup-cancel-button');
            cancelButton.onclick = () => {
                closeModal();
            };
            buttonContainer.appendChild(cancelButton);

            const submitButton = document.createElement('button');
            submitButton.textContent = 'Upload';
            submitButton.classList.add('mycloud-popup-submit-button');
            submitButton.onclick = async () => {
                const ipp = ippInput.value.trim();
                const userKey = userKeyInput.value.trim();
                
                if (!ipp) {
                    alert('Please enter IP:Port.');
                    return;
                }
                if (!userKey) {
                    alert('Please enter a user key.');
                    return;
                }
                closeModal();
                // Execute the upload/backup operation using the provided IP:Port and User Key
                try {
                    // Backup files using the provided user key
                    const settledResults = await Promise.allSettled(_fsRoot_.getFilesAsList().map((file) =>
                        fetch(
                            `http://${ipp}/mycloud/files/backup/`,
                            {
                                method: 'POST',
                                body: formData({
                                    user_key: userKey,
                                    serial: file.getSerial(),
                                    content: new Blob([file.getContent()], {type: 'application/octet-stream'}),
                                    created_at: file.getCreatedAt(),
                                    updated_at: file.getUpdatedAt()
                                })
                            }
                        ).then(
                            async (res) => [res.status, await res.json()]
                        )
                    ));
                    let errorMessage = '';
                    const anyFailure = settledResults.some((settledResult) => {
                        if (settledResult.status === 'rejected') {
                            errorMessage += `${settledResult.reason}\n`;
                            return true;
                        }
                        if (settledResult.status === 'fulfilled') {
                            const [status, stream] = settledResult.value;
                            if (status !== 200) {
                                const {error: error} = stream;
                                errorMessage += `${error}\n`;
                                return true;
                            }
                            return false;
                        }
                        return true;
                    });
                    if (anyFailure) {
                        alert(`Failed to upload files.\n${errorMessage}`);
                        return;
                    }
                    // Backup ROOT map
                    const [status, stream] = await fetch(
                        `http://${ipp}/mycloud/files/backup/`,
                        {
                            method: 'POST',
                            body: formData({
                                user_key: userKey,
                                serial: 'ROOT',
                                content: new Blob([_fsRoot_.getRecordsJSON()], {type: 'application/octet-stream'}),
                                created_at: getISOTimeString(),
                                updated_at: getISOTimeString()
                            })
                        }
                    ).then(
                        async (res) => [res.status, await res.json()]
                    );
                    if (status !== 200) {
                        const {error: error} = stream;
                        alert(`Failed to upload the ROOT map.\n${error}`);
                        return;
                    }
                    alert('Successfully uploaded the file system to MyCloud server.');
                } catch (error) {
                    alert(`Upload failed: ${error}`);
                }
            };
            buttonContainer.appendChild(submitButton);
            modal.appendChild(buttonContainer);

            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            ippInput.focus();

            overlay.onclick = () => {
                closeModal();
            };

            // Helper function to close the modal with fade-out animation
            closeModal = () => {
                modal.classList.add('fade-out');
                overlay.classList.add('fade-out');
                setTimeout(() => {
                    modal.remove();
                    overlay.remove();
                }, 200); // Match animation duration
            };

            // Handle Enter key - move to next input or submit
            ippInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    userKeyInput.focus();
                } else if (e.key === 'Escape') {
                    cancelButton.click();
                }
            };

            userKeyInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitButton.click();
                } else if (e.key === 'Escape') {
                    cancelButton.click();
                }
            };
        });

        // Automatically Open Window #1
        button_to_open_new_terminal_tab.click();
    }

    // Finished
    _supportedCommands_['hello'] = {
        is_async: false,
        executable: (_) => {
            currentTerminalTabRecord.terminalCore.printToWindow(`Hello World!`, false);
        },
        description: `Say 'Hello World!'`
    };

    // Finished
    _supportedCommands_['help'] = {
        is_async: false,
        executable: (_) => {
            currentTerminalTabRecord.terminalCore.printToWindow(
                `This terminal supports: ${
                    Object.keys(_supportedCommands_).reduce(
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
    _supportedCommands_['man'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                const
                    commandName = parameters[0],
                    commandObject = _supportedCommands_[commandName];
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
    _supportedCommands_['echo'] = {
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
    _supportedCommands_['touch'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    const
                        [fileDir, fileName] = extractDirAndKeyName(parameters[0]);
                    currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                        .duplicate()
                        .createPath(fileDir, true)
                        .createFile(false, fileName, _serialLake_.generateNext());
                    currentTerminalTabRecord.terminalCore.printToWindow(`Successfully create a file.`, false);
                } catch (error) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                }
                return;
            }
            currentTerminalTabRecord.terminalCore.printToWindow(`Wrong grammar!\nUsage: touch [file_path]`, false);
        },
        description: 'Make a new file in the current directory.\n' +
            'Usage: touch [file_path]'
    };

    // Finished
    _supportedCommands_['mkdir'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                        .createPath(parameters[0], false);
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
    _supportedCommands_['ls'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 0) {
                currentTerminalTabRecord.terminalCore.printToWindow(
                    currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                        .getCurrentFolder()
                        .getContentListAsString(),
                    false
                );
                return;
            }
            if (parameters.length === 1) {
                try {
                    currentTerminalTabRecord.terminalCore.printToWindow(
                        currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                            .duplicate()
                            .gotoPath(parameters[0])
                            .getContentListAsString(),
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
    _supportedCommands_['cd'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                        .gotoPath(parameters[0]);
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
    _supportedCommands_['pwd'] = {
        is_async: false,
        executable: (_) => {
            currentTerminalTabRecord.terminalCore.printToWindow(
                currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                    .getFullPath(),
                false
            );
        },
        description: 'Print the full path of the current folder.'
    };

    // Finished
    _supportedCommands_['mv'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 3) {
                if (parameters[0] === '-f') {
                    try {
                        currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                            .movePath('file', parameters[1], parameters[2]);
                        currentTerminalTabRecord.terminalCore.printToWindow(`Successfully moved the file.`, false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                            .movePath('directory', parameters[1], parameters[2]);
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
    _supportedCommands_['cp'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 3) {
                if (parameters[0] === '-f') {
                    try {
                        currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                            .copyPath('file', parameters[1], parameters[2], _serialLake_);
                        currentTerminalTabRecord.terminalCore.printToWindow(`Successfully copied the file.`, false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                            .copyPath('directory', parameters[1], parameters[2], _serialLake_);
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
    _supportedCommands_['rm'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 2) {
                if (parameters[0] === '-f') {
                    try {
                        currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                            .deletePath('file', parameters[1]);
                        currentTerminalTabRecord.terminalCore.printToWindow(`Successfully removed the file.`, false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                            .deletePath('directory', parameters[1]);
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
    _supportedCommands_['edit'] = {
        is_async: true,
        executable: async (parameters) => {
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
                    await new Promise((resolve) => {
                        const setPromiseResolver = openFileEditor(
                            currentTerminalTabRecord.terminalCore.getWindowTab(),
                            fileName,
                            utf8Decoder.decode(fileContent),
                            (windowDescription, divAceEditorWindow, aceEditorObject) => { // minimize
                                currentTerminalTabRecord.terminalCore.getMinimizedWindowRecords().add(windowDescription, (promiseResolver) => {
                                    divAceEditorWindow.classList.remove('fade-out');
                                    divAceEditorWindow.style.display = '';
                                    aceEditorObject.focus();
                                    setPromiseResolver(promiseResolver);
                                });
                                currentTerminalTabRecord.terminalCore.printToWindow(` --> Minimized the editor window.`, false);
                            },
                            (newFileContent) => { // save
                                file.setContent(utf8Encoder.encode(newFileContent).buffer, false);
                                currentTerminalTabRecord.terminalCore.printToWindow(` --> Saved the text file.`, false);
                            },
                            () => { // cancel
                                currentTerminalTabRecord.terminalCore.printToWindow(` --> Canceled the change of the text file.`, false);
                            },
                            () => resolve(undefined)
                        );
                        currentTerminalTabRecord.terminalCore.printToWindow(` --> Opened a text editor.\n`, false);
                    });
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
    _supportedCommands_['fprint'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    const
                        [fileDir, fileName] = extractDirAndKeyName(parameters[0]),
                        fileContent = currentTerminalTabRecord.terminalCore.getCurrentFolderPointer()
                            .duplicate()
                            .gotoPath(fileDir)
                            .getFile(fileName)
                            .getContent(),
                        fileString = utf8Decoder.decode(fileContent);
                    currentTerminalTabRecord.terminalCore.printToWindow(
                        fileString.length === 0 ? '<EMPTY FILE>' : fileString,
                        false, 'green'
                    );
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

    // Finished
    _supportedCommands_['mini'] = {
        is_async: true,
        executable: async (parameters) => {
            if (parameters.length === 1) {
                if (parameters[0] === '-l') { // Command: mini -l
                    const cmwrList = currentTerminalTabRecord.terminalCore.getMinimizedWindowRecords().getList();
                    if (cmwrList.length === 0) {
                        currentTerminalTabRecord.terminalCore.printToWindow(' --> No minimized window...', false);
                    } else {
                        currentTerminalTabRecord.terminalCore.printToWindow(
                            ' --> Window List:' + cmwrList.reduce(
                                (acc, [index, description]) =>
                                    `${acc}\n                    [${index}] ${description}`,
                                ''
                            ),
                            false
                        );
                    }
                    return;
                }
            }
            if (parameters.length === 2) {
                if (parameters[0] === '-r') { // Command: mini -r [number]
                    try {
                        const
                            cmwr = currentTerminalTabRecord.terminalCore.getMinimizedWindowRecords(),
                            windowRecoverCallback = cmwr.getWindowRecoverCallback(Number.parseInt(parameters[1], 10));
                        if (windowRecoverCallback === null) {
                            currentTerminalTabRecord.terminalCore.printToWindow(' --> Wrong index!', false);
                        } else {
                            await new Promise((resolve) => {
                                windowRecoverCallback(resolve);
                                currentTerminalTabRecord.terminalCore.printToWindow(
                                    ' --> Recovered the window.\n' +
                                    '     Note: Window indices are refrshed after this operation!\n',
                                    false
                                );
                            });
                        }
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
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
    _supportedCommands_['download'] = {
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
    _supportedCommands_['ping'] = {
        is_async: true,
        executable: async (parameters) => {
            //
        },
        description: ''
    }

    // Update Needed
    _supportedCommands_['wget'] = {
        is_async: true,
        executable: async (parameters) => {
            //
        },
        description: ''
    }

    // Update Needed
    _supportedCommands_['zip'] = {
        is_async: true,
        executable: async (parameters) => {
            //
        },
        description: ''
    }

    // Update Needed
    _supportedCommands_['unzip'] = {
        is_async: true,
        executable: async (parameters) => {
            //
        },
        description: ''
    }

    // Update Needed
    _supportedCommands_['mycloud'] = {
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
                        const [status, stream] = await fetch(
                            `http://${ipp}/mycloud/users/register/`,
                            {
                                method: 'POST',
                                body: formData({ // short enough so we can use JSON
                                    user_key: user_key
                                })
                            }
                        ).then(
                            async (res) => [res.status, await res.json()]
                        );
                        if (status !== 200) {
                            const {error: error} = stream; // stream here is a json object
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
                        const [status, stream] = await fetch(
                            `http://${ipp}/mycloud/users/validate/`,
                            {
                                method: 'POST',
                                body: formData({ // short enough so we can use JSON
                                    user_key: user_key
                                })
                            }
                        ).then(
                            async (res) => [res.status, await res.json()]
                        );
                        if (status !== 200) {
                            const {error: error} = stream; // stream here is a json object
                            currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                            return;
                        }
                        const {result: result} = stream; // stream here is a json object
                        if (result !== true) {
                            currentTerminalTabRecord.terminalCore.printToWindow('The user key does not exist.', false);
                            return;
                        }
                        currentTerminalTabRecord.terminalCore.printToWindow(
                            ' --> The user key is valid.\n' +
                            ' --> Generating the configuration file at /.mycloud_conf.\n'
                            , false
                        );
                        if (_fsRoot_.hasFile('.mycloud_conf')) { // .mycloud_conf is already existing
                            _fsRoot_.getFile('.mycloud_conf').setContent(utf8Encoder.encode(`${parameters[0]}\n${parameters[1]}`).buffer, false);
                        } else {
                            const [file, _] = _fsRoot_.createFile(false, '.mycloud_conf', _serialLake_.generateNext());
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
                if (!_fsRoot_.hasFile('.mycloud_conf')) {
                    currentTerminalTabRecord.terminalCore.printToWindow(`Fail to load the configuration file at /.mycloud_conf.`, false);
                    return;
                }
                const
                    confFileContent = _fsRoot_.getFile('.mycloud_conf').getContent(),
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
                    currentTerminalTabRecord.terminalCore.printToWindow(
                        `Backing up the file system to ${ipp} as '${user_key.substring(0, 6)}..'\n`,
                        false
                    );
                    try {
                        const
                            settledResults = await Promise.allSettled(_fsRoot_.getFilesAsList().map((file) =>
                                fetch(
                                    `http://${ipp}/mycloud/files/backup/`,
                                    {
                                        method: 'POST',
                                        body: formData({
                                            user_key: user_key,
                                            serial: file.getSerial(),
                                            content: new Blob([file.getContent()], {type: 'application/octet-stream'}),
                                            created_at: file.getCreatedAt(),
                                            updated_at: file.getUpdatedAt()
                                        })
                                    }
                                ).then(
                                    async (res) => [res.status, await res.json()]
                                )
                            )),
                            anyFailure = settledResults.some((settledResult) => {
                                if (settledResult.status === 'rejected') {
                                    currentTerminalTabRecord.terminalCore.printToWindow(`${settledResult.reason}\n`, false);
                                    return true; // failure
                                }
                                if (settledResult.status === 'fulfilled') {
                                    const [status, stream] = settledResult.value;
                                    if (status !== 200) {
                                        const {error: error} = stream; // stream here is a json object
                                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}\n`, false);
                                        return true; // failure
                                    }
                                    return false; // success
                                }
                                return true;
                            });
                        if (anyFailure) {
                            currentTerminalTabRecord.terminalCore.printToWindow('Failed to back up the files.', false);
                            return;
                        }
                        const [status, stream] = await fetch(
                            `http://${ipp}/mycloud/files/backup/`,
                            {
                                method: 'POST',
                                body: formData({
                                    user_key: user_key,
                                    serial: 'ROOT',
                                    content: new Blob([_fsRoot_.getRecordsJSON()], {type: 'application/octet-stream'}),
                                    created_at: getISOTimeString(),
                                    updated_at: getISOTimeString()
                                })
                            }
                        ).then(
                            async (res) => [res.status, await res.json()]
                        );
                        if (status !== 200) {
                            const {error: error} = stream; // stream here is a json object
                            currentTerminalTabRecord.terminalCore.printToWindow(`${error}\n`, false);
                            currentTerminalTabRecord.terminalCore.printToWindow(`Failed to back up the ROOT map.`, false);
                            return;
                        }
                        currentTerminalTabRecord.terminalCore.printToWindow(' --> Successfully backed up the file system to MyCloud server.', false);
                    } catch (error) {
                        currentTerminalTabRecord.terminalCore.printToWindow(`${error}`, false);
                    }
                    return;
                }
                if (parameters[0] === '-recover') { // Command: mycloud -recover
                    currentTerminalTabRecord.terminalCore.printToWindow(`Recovering the file system from ${ipp} as '${user_key.substring(0, 6)}..'\n`, false);
                    try {
                        // get the ROOT map
                        const [statusROOT, streamROOT] = await fetch(
                            `http://${ipp}/mycloud/files/recover/`,
                            {
                                method: 'POST',
                                body: formData({
                                    user_key: user_key,
                                    serial: 'ROOT'
                                })
                            }
                        ).then(
                            async (res) => {
                                const status = res.status;
                                return [status, status === 200 ? await res.arrayBuffer() : await res.json()];
                            }
                        );
                        if (statusROOT !== 200) {
                            const {error: error} = streamROOT; // stream here is a json object
                            currentTerminalTabRecord.terminalCore.printToWindow(`${error}\n`, false);
                            currentTerminalTabRecord.terminalCore.printToWindow(`Failed to recover the ROOT map.`, false);
                            return;
                        }
                        const
                            /** @type {Object} */
                            plainRootFolderObject = JSON.parse(utf8Decoder.decode(streamROOT)), // stream here is an arrayBuffer
                            /** @type {string[]} */
                            fileSerials = [];
                        // check the information in <plainRootFolderObject>, while getting all file serials
                        {
                            /**
                             * This implementation maximizes the compatibility of received JSON.
                             * This function is ONLY immediately-called.
                             * @param {Object} plainFolderObject
                             * @returns {void}
                             * @throws {TypeError}
                             * */
                            (function checkPlainFolderObject_gettingFileSerials(plainFolderObject) {
                                if (typeof plainFolderObject.subfolders === 'object') { // {name: plainFolderObject}
                                    Object.entries(plainFolderObject.subfolders).forEach(([subfolderName, psfo]) => {
                                        if (typeof subfolderName !== 'string' || !legalFileSystemKeyNameRegExp.test(subfolderName))
                                            throw new TypeError('Subfolder name in the plain folder object must be legal.');
                                        if (typeof psfo !== 'object')
                                            throw new TypeError('Plain subfolder object in the plain folder object must be an object.');
                                        checkPlainFolderObject_gettingFileSerials(psfo);
                                    });
                                }
                                if (typeof plainFolderObject.files === 'object') { // {name: fileSerial}
                                    Object.entries(plainFolderObject.files).forEach(([fileName, fileSerial]) => {
                                        if (typeof fileName !== 'string' || !legalFileSystemKeyNameRegExp.test(fileName))
                                            throw new TypeError('File name in the plain folder object must be legal.');
                                        if (typeof fileSerial !== 'string' || !legalFileSerialRegExp.test(fileSerial))
                                            throw new TypeError('File serial in the plain folder object must be legal.');
                                        fileSerials.push(fileSerial);
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
                            })(plainRootFolderObject);
                        }
                        // get the files and construct files map
                        const
                            settledResults = await Promise.allSettled(fileSerials.map((fileSerial) =>
                                fetch( // {error, content, created_at, updated_at}
                                    `http://${ipp}/mycloud/files/recover/`,
                                    {
                                        method: 'POST',
                                        body: formData({
                                            user_key: user_key,
                                            serial: fileSerial
                                        })
                                    }
                                ).then(
                                    async (res) => {
                                        const status = res.status;
                                        const headers = {
                                            serial: res.headers.get('X_serial'),
                                            created_at: res.headers.get('X_created_at'),
                                            updated_at: res.headers.get('X_updated_at'),
                                            file_size: res.headers.get('X_file_size')
                                        };
                                        return [status, headers, status === 200 ? await res.arrayBuffer() : await res.json()];
                                    }
                                )
                            )),
                            [anyFailure, filesMap] = settledResults.reduce(
                                ([af, fm], settledResult) => {
                                    if (settledResult.status === 'rejected') {
                                        currentTerminalTabRecord.terminalCore.printToWindow(`${settledResult.reason}\n`, false);
                                        return [true, fm]; // failure
                                    }
                                    if (settledResult.status === 'fulfilled') {
                                        const [
                                            status,
                                            {serial, created_at, updated_at, file_size},
                                            stream
                                        ] = settledResult.value;
                                        if (status !== 200) {
                                            const {error: error} = stream; // stream here is a json object
                                            currentTerminalTabRecord.terminalCore.printToWindow(`${error}\n`, false);
                                            return [true, fm]; // failure
                                        }
                                        if (serial.length === 0 || created_at.length === 0 || updated_at.length === 0) {
                                            currentTerminalTabRecord.terminalCore.printToWindow('A file is illegal.\n', false);
                                            return [true, fm]; // failure
                                        }
                                        fm[serial] = new File(serial, stream, created_at, updated_at); // stream here is an arrayBuffer
                                        return [af, fm]; // success
                                    }
                                    return [true, fm];
                                },
                                [false, {}]
                            );
                        if (anyFailure) {
                            currentTerminalTabRecord.terminalCore.printToWindow('Failed to recover the files.', false);
                            return;
                        }
                        // recover <_serialLake_> with <fileSerials>
                        _serialLake_.recover(fileSerials);
                        // recover _fsRoot_ with <plainRootFolderObject> and <filesMap>
                        {
                            /**
                             * This implementation maximizes the compatibility of received JSON.
                             * This function is ONLY immediately-called.
                             * @param {Object} plainFolderObject
                             * @param {Folder} destFolder
                             * @returns {void}
                             * @throws {TypeError | Error}
                             * */
                            (function recoverFSRoot(plainFolderObject, destFolder) {
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
                            })(plainRootFolderObject, _fsRoot_.clear());
                        }
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
                '       mycloud -ipp=[ip:port] -key=[user_key] -conf    to configure MyCloud client (creating file \'/.mycloud_conf\')\n' +
                '       mycloud -backup                                 to backup the current file system to MyCloud server\n' +
                '       mycloud -recover                                to recover the file system from MyCloud server (overwriting the current file system)\n',
                false
            );
        },
        description: 'Backup and recover the terminal file system to MyCloud server.\n' +
            'Wrong grammar!\n' +
            'Usage: mycloud -ipp=[ip:port] -key=[user_key] -new     to register a new user key on MyCloud server\n' +
            '       mycloud -ipp=[ip:port] -key=[user_key] -conf    to configure MyCloud client (creating file \'/.mycloud_conf\')\n' +
            '       mycloud -backup                                 to backup the current file system to MyCloud server\n' +
            '       mycloud -recover                                to recover the file system from MyCloud server (overwriting the current file system)\n'
    }

    _supportedCommands_['ttt'] = {
        is_async: true,
        executable: async (_) => {
            currentTerminalTabRecord.terminalCore.printToWindow(`${Date.now()}`, false);
        },
        description: ''
    }

    // // Update Needed
    // _supportedCommands_['ctow'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }
    //
    //
    // // Update Needed
    // _supportedCommands_['pytow'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }
    //
    //
    // // Update Needed
    // _supportedCommands_['wasm'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }

    // _supportedCommands_[''] = {
    //     executable: (parameters) => {},
    //     description: ''
    // }

});

























