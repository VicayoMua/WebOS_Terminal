import {
    Terminal,
    FitAddon,
    SerializeAddon,
    // JSZip,
    getISOTimeString,
    randomInt,
    utf8Decoder,
    utf8Encoder,
    popupAlert,
    popupFileEditor,
    legalFileSystemKeyNameRegExp,
    legalFileSerialRegExp,
    SerialLake,
    File,
    Folder,
    extractDirAndKeyName,
    TerminalFolderPointer,
    RGBColor,
    TerminalCore,
    formData,
    registerUserKeyToMyCloud,
    verifyMyCloudSetup,
    backupFSToMyCloud,
    recoverFSFromMyCloud
} from './terminal_core.js';

document.addEventListener('DOMContentLoaded', () => {
    const
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
        /** @type {TerminalCore | null} */
        currentTerminalCore = null;
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
        /** @type {TerminalCore[]} */
        _terminalCores_ = [],
        /** @type {Record<string, {is_async: boolean, executable: function(string[]):void, description: string}>} */
        _supportedCommands_ = {}; // Initialize Supported Commands

    // Set Up Button Functions Links
    {
        const
            /** @type {number} */
            MAX_TAB_COUNT = 40,
            /** @type {HTMLButtonElement} */
            button_to_switch_theme = document.getElementById('button-to-switch-theme'),
            /** @type {HTMLDivElement} */
            div_terminal_window_frames = document.getElementById('terminal-window-frames'),
            /** @type {HTMLElement} */
            nav_view_navigation = document.getElementById('view-navigation'),
            /** @type {HTMLButtonElement} */
            button_to_open_new_terminal_tab = document.getElementById('button-to-open-new-terminal-tab'),
            /** @type {HTMLButtonElement} */
            button_to_save_terminal_log = document.getElementById('button-to_save-terminal-log'),
            /** @type {HTMLButtonElement} */
            button_to_add_files_to_terminal = document.getElementById('button-to-add-files-to-terminal'),
            /** @type {HTMLButtonElement} */
            button_to_register_on_mycloud_server = document.getElementById('button-to-register-on-mycloud-server'),
            /** @type {HTMLButtonElement} */
            button_to_backup_to_mycloud_server = document.getElementById('button-to-backup-to-mycloud-server'),
            /** @type {HTMLButtonElement} */
            button_to_recover_from_mycloud_server = document.getElementById('button-to-recover-from-mycloud-server');

        // localStorage.getItem()
        button_to_switch_theme.addEventListener('click', () => {
            button_to_switch_theme.innerText = document.body.classList.toggle('dark-body-mode') ? '☀️' : '🌙';
            // focus on the terminal window
            currentTerminalCore.getWindowTextArea().focus();
        });

        button_to_open_new_terminal_tab.addEventListener('click', () => {
            // check the tab count limit
            if (tabCount >= MAX_TAB_COUNT) {
                popupAlert(
                    currentTerminalCore.getWindowFrame(),
                    'Limit Reached',
                    `You can open at most ${MAX_TAB_COUNT} terminal tabs.`
                );
                return;
            }

            // record the total tab count & use it as current tab number
            tabCount++;

            // create a new <HTMLDivElement> for the new Terminal
            const divNewTerminalWindowFrame = document.createElement('div');
            divNewTerminalWindowFrame.setAttribute('class', 'terminal-window-frame');
            div_terminal_window_frames.appendChild(divNewTerminalWindowFrame);

            // create a new <HTMLButtonElement> for the view switch for the new terminal core
            const buttonNewTerminalViewSwitch = document.createElement('button');
            buttonNewTerminalViewSwitch.type = 'button';
            buttonNewTerminalViewSwitch.textContent = `Tab #${tabCount}`;
            nav_view_navigation.appendChild(buttonNewTerminalViewSwitch);

            const newTerminalCore = new TerminalCore(
                new Terminal(XTermSetup),
                divNewTerminalWindowFrame,
                buttonNewTerminalViewSwitch,
                _fsRoot_,
                _supportedCommands_
            );
            _terminalCores_.push(newTerminalCore);

            buttonNewTerminalViewSwitch.addEventListener('click', () => {
                if (currentTerminalCore !== newTerminalCore) { // make sure the switch is necessary
                    // change the nav button style and the terminal tab view
                    _terminalCores_.forEach((terminalCore) => {
                        terminalCore.getWindowFrame().classList.remove('current-tab');
                        terminalCore.getViewSwitchButton().classList.remove('current-tab');
                    });
                    divNewTerminalWindowFrame.classList.add('current-tab');
                    buttonNewTerminalViewSwitch.classList.add('current-tab');
                    // switch the terminal tab record
                    currentTerminalCore = newTerminalCore;
                    setTimeout(() => {
                        const fitAddon = newTerminalCore.getFitAddon();
                        if (fitAddon !== null) fitAddon.fit();
                    }, 100);
                }
                // focus on the terminal window
                currentTerminalCore.getWindowTextArea().focus();
            });

            if (currentTerminalCore === null) // if newly-created terminal tab is <Tab #1>
                buttonNewTerminalViewSwitch.click();

            window.addEventListener('resize', () => {
                const fitAddon = newTerminalCore.getFitAddon();
                if (fitAddon !== null)
                    fitAddon.fit();
            });

            // focus on the terminal window
            currentTerminalCore.getWindowTextArea().focus();
        });

        button_to_save_terminal_log.addEventListener('click', () => {
            const
                url = URL.createObjectURL(new Blob([currentTerminalCore.getTerminalLogAsString()], {type: 'text/plain'})),
                link = document.createElement('a');
            link.href = url;
            link.download = `terminal_log @ ${getISOTimeString()}.txt`; // the filename the user will get
            link.click();
            URL.revokeObjectURL(url);
            // focus on the terminal window
            currentTerminalCore.getWindowTextArea().focus();
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
                        popupAlert(
                            currentTerminalCore.getWindowFrame(),
                            'Type Error',
                            'The file name must be a string.'
                        );
                        return;
                    }
                    const reader = new FileReader();
                    {
                        // set up behaviors on errors
                        reader.onerror = (error) => {
                            popupAlert(
                                currentTerminalCore.getWindowFrame(),
                                'Error',
                                `Failed to read the file "${file.name}". <-- ${error}`
                            );
                        };
                        // set up behaviors on loading
                        reader.onload = (reader_event) => {
                            const fileContent = reader_event.target.result;
                            if (typeof fileContent !== 'string' && !(fileContent instanceof ArrayBuffer)) {
                                popupAlert(
                                    currentTerminalCore.getWindowFrame(),
                                    'Error',
                                    `Unexpectedly failed to load "${file.name}".`
                                );
                                return;
                            }
                            const [newFile, _] = currentTerminalCore.getCurrentFolderPointer()
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
                popupAlert(
                    currentTerminalCore.getWindowFrame(),
                    'Success',
                    `Added ${input_event.target.files.length} file(s) to the current directory.`
                );
            });
            // activate the file input element
            input.click();
        });

        let
            /** @type {string} */
            mycloudIpp = '127.0.0.1:8088',
            /** @type {string} */
            mycloudUserKey = '';

        button_to_register_on_mycloud_server.addEventListener('click', () => {
            // create overlay
            const divOverlay = document.createElement('div');
            divOverlay.classList.add('mycloud-popup-overlay');
            divOverlay.addEventListener('click', () => undefined);

            // create a divMyCloudPopup input box for IP:Port and User Key
            const divMyCloudPopup = document.createElement('div');
            divMyCloudPopup.classList.add('mycloud-popup');

            const h3Title = document.createElement('h3');
            h3Title.textContent = 'Register on MyCloud Server';
            divMyCloudPopup.appendChild(h3Title);

            // IP:Port input container
            const divIppInputContainer = document.createElement('div');
            divIppInputContainer.classList.add('mycloud-popup-input-container');

            const ippLabel = document.createElement('label');
            ippLabel.textContent = 'Server IP:Port';
            ippLabel.classList.add('mycloud-popup-input-label');

            const ippInput = document.createElement('input');
            ippInput.type = 'text';
            ippInput.value = mycloudIpp;
            ippInput.classList.add('mycloud-popup-input');
            ippInput.addEventListener('change', () => {
                mycloudIpp = ippInput.value;
            });

            divIppInputContainer.appendChild(ippLabel);
            divIppInputContainer.appendChild(ippInput);

            divMyCloudPopup.appendChild(divIppInputContainer);

            // user key input container
            const divUserKeyInputContainer = document.createElement('div');
            divUserKeyInputContainer.classList.add('mycloud-popup-input-container');

            const userKeyLabel = document.createElement('label');
            userKeyLabel.textContent = 'User Key';
            userKeyLabel.classList.add('mycloud-popup-input-label');

            const userKeyInput = document.createElement('input');
            userKeyInput.type = 'text';
            userKeyInput.value = mycloudUserKey;
            userKeyInput.classList.add('mycloud-popup-input');
            userKeyInput.addEventListener('change', () => {
                mycloudUserKey = userKeyInput.value;
            });

            divUserKeyInputContainer.appendChild(userKeyLabel);
            divUserKeyInputContainer.appendChild(userKeyInput);

            divMyCloudPopup.appendChild(divUserKeyInputContainer);

            // helper function to close the divMyCloudPopup with fade-out animation
            const closePopup = () => {
                divMyCloudPopup.classList.add('fade-out');
                divOverlay.classList.add('fade-out');
                setTimeout(() => {
                    divMyCloudPopup.remove();
                    divOverlay.remove();
                }, 200); // Match animation duration
            };

            // exit buttons container
            const divExitButtonsContainer = document.createElement('div');
            divExitButtonsContainer.classList.add('mycloud-popup-buttons-container');

            const registerButton = document.createElement('button');
            registerButton.textContent = '📝 Register';
            registerButton.classList.add('button');
            registerButton.classList.add('primary-button');

            const cancelButton = document.createElement('button');
            cancelButton.textContent = '✖ Cancel';
            cancelButton.classList.add('button');
            cancelButton.classList.add('secondary-button');

            registerButton.addEventListener('click', async () => {
                closePopup();
                const alertExists = popupAlert(
                    document.body,
                    'Processing',
                    'Registering a new user key...',
                    false,
                    false
                );
                try {
                    await registerUserKeyToMyCloud(mycloudIpp, mycloudUserKey);
                    alertExists.primary();
                    popupAlert(
                        document.body,
                        'Success',
                        'Registered a new user key.'
                    );
                } catch (error) {
                    alertExists.primary();
                    mycloudUserKey = '';
                    popupAlert(
                        document.body,
                        'Error',
                        `Failed to register a new user key. <-- ${error}`
                    );
                }
            });

            cancelButton.addEventListener('click', () => {
                closePopup();
            });

            divExitButtonsContainer.appendChild(registerButton);
            divExitButtonsContainer.appendChild(cancelButton);

            divMyCloudPopup.appendChild(divExitButtonsContainer);

            document.body.appendChild(divOverlay);
            document.body.appendChild(divMyCloudPopup);

            ippInput.focus();
        });

        button_to_backup_to_mycloud_server.addEventListener('click', () => {
            // create overlay
            const divOverlay = document.createElement('div');
            divOverlay.classList.add('mycloud-popup-overlay');
            divOverlay.addEventListener('click', () => undefined);

            // create a divMyCloudPopup input box for IP:Port and User Key
            const divMyCloudPopup = document.createElement('div');
            divMyCloudPopup.classList.add('mycloud-popup');

            const h3Title = document.createElement('h3');
            h3Title.textContent = 'Backup to MyCloud Server';
            divMyCloudPopup.appendChild(h3Title);

            // IP:Port input container
            const divIppInputContainer = document.createElement('div');
            divIppInputContainer.classList.add('mycloud-popup-input-container');

            const ippLabel = document.createElement('label');
            ippLabel.textContent = 'Server IP:Port';
            ippLabel.classList.add('mycloud-popup-input-label');

            const ippInput = document.createElement('input');
            ippInput.type = 'text';
            ippInput.value = mycloudIpp;
            ippInput.classList.add('mycloud-popup-input');
            ippInput.addEventListener('change', () => {
                mycloudIpp = ippInput.value;
            });

            divIppInputContainer.appendChild(ippLabel);
            divIppInputContainer.appendChild(ippInput);

            divMyCloudPopup.appendChild(divIppInputContainer);

            // user key input container
            const divUserKeyInputContainer = document.createElement('div');
            divUserKeyInputContainer.classList.add('mycloud-popup-input-container');

            const userKeyLabel = document.createElement('label');
            userKeyLabel.textContent = 'User Key';
            userKeyLabel.classList.add('mycloud-popup-input-label');

            const userKeyInput = document.createElement('input');
            userKeyInput.type = 'text';
            userKeyInput.value = mycloudUserKey;
            userKeyInput.classList.add('mycloud-popup-input');
            userKeyInput.addEventListener('change', () => {
                mycloudUserKey = userKeyInput.value;
            });

            divUserKeyInputContainer.appendChild(userKeyLabel);
            divUserKeyInputContainer.appendChild(userKeyInput);

            divMyCloudPopup.appendChild(divUserKeyInputContainer);

            // helper function to close the divMyCloudPopup with fade-out animation
            const closePopup = () => {
                divMyCloudPopup.classList.add('fade-out');
                divOverlay.classList.add('fade-out');
                setTimeout(() => {
                    divMyCloudPopup.remove();
                    divOverlay.remove();
                }, 200); // Match animation duration
            };

            // exit buttons container
            const divExitButtonsContainer = document.createElement('div');
            divExitButtonsContainer.classList.add('mycloud-popup-buttons-container');

            const backupButton = document.createElement('button');
            backupButton.textContent = '🗄️ Backup';
            backupButton.classList.add('button');
            backupButton.classList.add('primary-button');

            const cancelButton = document.createElement('button');
            cancelButton.textContent = '✖ Cancel';
            cancelButton.classList.add('button');
            cancelButton.classList.add('secondary-button');

            backupButton.addEventListener('click', async () => {
                closePopup();
                const alertExists = popupAlert(
                    document.body,
                    'Processing',
                    'Backing-up the whole file system...',
                    false,
                    false
                );
                try {
                    await verifyMyCloudSetup(mycloudIpp, mycloudUserKey);
                    await backupFSToMyCloud(mycloudIpp, mycloudUserKey, _fsRoot_);
                    alertExists.primary();
                    popupAlert(
                        document.body,
                        'Success',
                        'Backed-up the whole file system.'
                    );
                } catch (error) {
                    alertExists.primary();
                    popupAlert(
                        document.body,
                        'Error',
                        `Failed to back up the whole file system. <-- ${error}`
                    );
                }
            });

            cancelButton.addEventListener('click', () => {
                closePopup();
            });

            divExitButtonsContainer.appendChild(backupButton);
            divExitButtonsContainer.appendChild(cancelButton);

            divMyCloudPopup.appendChild(divExitButtonsContainer);

            document.body.appendChild(divOverlay);
            document.body.appendChild(divMyCloudPopup);

            ippInput.focus();
        });

        button_to_recover_from_mycloud_server.addEventListener('click', () => {
            // create overlay
            const divOverlay = document.createElement('div');
            divOverlay.classList.add('mycloud-popup-overlay');
            divOverlay.addEventListener('click', () => undefined);

            // create a divMyCloudPopup input box for IP:Port and User Key
            const divMyCloudPopup = document.createElement('div');
            divMyCloudPopup.classList.add('mycloud-popup');

            const h3Title = document.createElement('h3');
            h3Title.textContent = 'Recover from MyCloud Server';
            divMyCloudPopup.appendChild(h3Title);

            // IP:Port input container
            const divIppInputContainer = document.createElement('div');
            divIppInputContainer.classList.add('mycloud-popup-input-container');

            const ippLabel = document.createElement('label');
            ippLabel.textContent = 'Server IP:Port';
            ippLabel.classList.add('mycloud-popup-input-label');

            const ippInput = document.createElement('input');
            ippInput.type = 'text';
            ippInput.value = mycloudIpp;
            ippInput.classList.add('mycloud-popup-input');
            ippInput.addEventListener('change', () => {
                mycloudIpp = ippInput.value;
            });

            divIppInputContainer.appendChild(ippLabel);
            divIppInputContainer.appendChild(ippInput);

            divMyCloudPopup.appendChild(divIppInputContainer);

            // user key input container
            const divUserKeyInputContainer = document.createElement('div');
            divUserKeyInputContainer.classList.add('mycloud-popup-input-container');

            const userKeyLabel = document.createElement('label');
            userKeyLabel.textContent = 'User Key';
            userKeyLabel.classList.add('mycloud-popup-input-label');

            const userKeyInput = document.createElement('input');
            userKeyInput.type = 'text';
            userKeyInput.value = mycloudUserKey;
            userKeyInput.classList.add('mycloud-popup-input');
            userKeyInput.addEventListener('change', () => {
                mycloudUserKey = userKeyInput.value;
            });

            divUserKeyInputContainer.appendChild(userKeyLabel);
            divUserKeyInputContainer.appendChild(userKeyInput);

            divMyCloudPopup.appendChild(divUserKeyInputContainer);

            // helper function to close the divMyCloudPopup with fade-out animation
            const closePopup = () => {
                divMyCloudPopup.classList.add('fade-out');
                divOverlay.classList.add('fade-out');
                setTimeout(() => {
                    divMyCloudPopup.remove();
                    divOverlay.remove();
                }, 200); // Match animation duration
            };

            // exit buttons container
            const divExitButtonsContainer = document.createElement('div');
            divExitButtonsContainer.classList.add('mycloud-popup-buttons-container');

            const recoverButton = document.createElement('button');
            recoverButton.textContent = '🔄 Recover';
            recoverButton.classList.add('button');
            recoverButton.classList.add('primary-button');

            const cancelButton = document.createElement('button');
            cancelButton.textContent = '✖ Cancel';
            cancelButton.classList.add('button');
            cancelButton.classList.add('secondary-button');

            recoverButton.addEventListener('click', async () => {
                closePopup();
                const alertExists = popupAlert(
                    document.body,
                    'Processing',
                    'Recovering the whole file system...',
                    false,
                    false
                );
                try {
                    await verifyMyCloudSetup(mycloudIpp, mycloudUserKey);
                    await recoverFSFromMyCloud(mycloudIpp, mycloudUserKey, _fsRoot_, _serialLake_);
                    alertExists.primary();
                    popupAlert(
                        document.body,
                        'Success',
                        'Recovered the whole file system.'
                    );
                } catch (error) {
                    alertExists.primary();
                    popupAlert(
                        document.body,
                        'Error',
                        `Failed to recover the whole file system. <-- ${error}`
                    );
                }
            });

            cancelButton.addEventListener('click', () => {
                closePopup();
            });

            divExitButtonsContainer.appendChild(recoverButton);
            divExitButtonsContainer.appendChild(cancelButton);

            divMyCloudPopup.appendChild(divExitButtonsContainer);

            document.body.appendChild(divOverlay);
            document.body.appendChild(divMyCloudPopup);

            ippInput.focus();
        });

        // Automatically Open Window #1
        button_to_open_new_terminal_tab.click();
    }

    _supportedCommands_['tt'] = {
        is_async: true,
        executable: async (_) => {
            popupAlert(
                currentTerminalCore.getWindowFrame(),
                '!Alert Title!',
                'Tdsfhfis adsfis thdsafasdfef alertedfdsfdsafadsfdsafsdafdsafsadfdffasfadsf message.'
            );
        },
        description: ''
    }

    // Finished
    _supportedCommands_['hello'] = {
        is_async: false,
        executable: (_) => {
            currentTerminalCore.printToWindow(`Hello World!`);
        },
        description: `Say 'Hello World!'`
    };

    // Finished
    _supportedCommands_['help'] = {
        is_async: false,
        executable: (_) => {
            currentTerminalCore.printToWindow(
                `This terminal supports:\n${
                    Object.keys(_supportedCommands_).reduce(
                        (acc, elem, index) => {
                            if (index === 0) return `     ${elem}`;
                            return (index % 6 === 0) ? `${acc},\n     ${elem}` : `${acc}, ${elem}`;
                        },
                        ''
                    )
                }.\n\nFor more details, please use the command 'man [command_name]'.`
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
                    currentTerminalCore.printToWindow(`Command '${commandName}' is not supported!`, RGBColor.red);
                } else {
                    currentTerminalCore.printToWindow(` --> ${commandObject.description}`, null, null, false, '        ');
                }
                return;
            }
            currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: man [command_name]`, RGBColor.red);
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
            currentTerminalCore.printToWindow(result.length > 0 ? result : `''`, RGBColor.black, RGBColor.turquoise);
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
                    currentTerminalCore.getCurrentFolderPointer()
                        .duplicate()
                        .createPath(fileDir, true)
                        .createFile(false, fileName, _serialLake_.generateNext());
                    currentTerminalCore.printToWindow(` --> Created a file.`, RGBColor.green);
                } catch (error) {
                    currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                }
                return;
            }
            currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: touch [file_path]`, RGBColor.red);
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
                    currentTerminalCore.getCurrentFolderPointer().createPath(parameters[0], false);
                    currentTerminalCore.printToWindow(` --> Created a directory, `, RGBColor.green);
                    currentTerminalCore.printToWindow(`OR the directory may already exist.`, RGBColor.turquoise);
                } catch (error) {
                    currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                }
                return;
            }
            currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: mkdir [folder_path]`, RGBColor.red);
        },
        description: 'Make a new directory.\n' +
            'Usage: mkdir [folder_path]'
    };

    // Finished
    _supportedCommands_['ls'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 0) {
                currentTerminalCore.printToWindow(
                    currentTerminalCore.getCurrentFolderPointer()
                        .getCurrentFolder()
                        .getContentListAsString()
                );
                return;
            }
            if (parameters.length === 1) {
                try {
                    currentTerminalCore.printToWindow(
                        currentTerminalCore.getCurrentFolderPointer()
                            .duplicate()
                            .gotoPath(parameters[0])
                            .getContentListAsString()
                    );
                } catch (error) {
                    currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                }
                return;
            }
            currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: ls [folder_path]`, RGBColor.red);
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
                    currentTerminalCore.getCurrentFolderPointer().gotoPath(parameters[0]);
                    currentTerminalCore.printToWindow(` --> Went to a directory.`, RGBColor.green);
                } catch (error) {
                    currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                }
                return;
            }
            currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: cd [folder_path]`, RGBColor.red);
        },
        description: 'Goto the given folder.\n' +
            'Usage: cd [folder_path]'
    };

    // Finished
    _supportedCommands_['pwd'] = {
        is_async: false,
        executable: (_) => {
            currentTerminalCore.printToWindow(
                currentTerminalCore.getCurrentFolderPointer().getFullPath()
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
                        currentTerminalCore.getCurrentFolderPointer()
                            .movePath('file', parameters[1], parameters[2]);
                        currentTerminalCore.printToWindow(` --> Moved a file.`, RGBColor.green);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        currentTerminalCore.getCurrentFolderPointer()
                            .movePath('directory', parameters[1], parameters[2]);
                        currentTerminalCore.printToWindow(` --> Moved a directory.`, RGBColor.green);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                    }
                    return;
                }
            }
            currentTerminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: mv -f [original_file_path] [destination_file_path]\n' +
                '       mv -d [original_directory_path] [destination_directory_path]',
                RGBColor.red
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
                        currentTerminalCore.getCurrentFolderPointer()
                            .copyPath('file', parameters[1], parameters[2], _serialLake_);
                        currentTerminalCore.printToWindow(` --> Copied a file.`, RGBColor.green);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        currentTerminalCore.getCurrentFolderPointer()
                            .copyPath('directory', parameters[1], parameters[2], _serialLake_);
                        currentTerminalCore.printToWindow(` --> Copied a directory.`, RGBColor.green);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                    }
                    return;
                }
            }
            currentTerminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: cp -f [original_file_path] [destination_file_path]\n' +
                '       cp -d [original_directory_path] [destination_directory_path]',
                RGBColor.red
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
                        currentTerminalCore.getCurrentFolderPointer()
                            .deletePath('file', parameters[1]);
                        currentTerminalCore.printToWindow(` --> Removed a file.`, RGBColor.green);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                    }
                    return;
                }
                if (parameters[0] === '-d') {
                    try {
                        currentTerminalCore.getCurrentFolderPointer()
                            .deletePath('directory', parameters[1]);
                        currentTerminalCore.printToWindow(` --> Removed a directory.`, RGBColor.green);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                    }
                    return;
                }
            }
            currentTerminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: rm -f [file_path]\n' +
                '       rm -d [directory_path]',
                RGBColor.red
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
                        file = currentTerminalCore.getCurrentFolderPointer()
                            .duplicate()
                            .gotoPath(fileDir)
                            .getFile(fileName),
                        fileContent = file.getContent();
                    await new Promise((resolve) => {
                        popupFileEditor(
                            currentTerminalCore.getWindowFrame(),
                            fileName,
                            utf8Decoder.decode(fileContent),
                            (newFileContent) => { // save
                                file.setContent(utf8Encoder.encode(newFileContent).buffer, false);
                                currentTerminalCore.printToWindow(` --> Updated a text file.`, RGBColor.yellow);
                                resolve(undefined);
                                currentTerminalCore.getWindowTextArea().focus();
                            },
                            () => { // cancel
                                currentTerminalCore.printToWindow(` --> Canceled updates on a text file.`, RGBColor.yellow);
                                resolve(undefined);
                                currentTerminalCore.getWindowTextArea().focus();
                            }
                        );
                        currentTerminalCore.printToWindow(` --> Opened a text editor.\n`, RGBColor.green);
                    });
                } catch (error) {
                    currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                }
                return;
            }
            currentTerminalCore.printToWindow(`Wrong grammar!\nUsage: edit [file_path]`, RGBColor.red);
        },
        description: 'Edit an existing file.\n' +
            'Usage: edit [file_path]'
    };

    // Finished
    _supportedCommands_['printf'] = {
        is_async: false,
        executable: (parameters) => {
            if (parameters.length === 1) {
                try {
                    const
                        [fileDir, fileName] = extractDirAndKeyName(parameters[0]),
                        fileContent = currentTerminalCore.getCurrentFolderPointer()
                            .duplicate()
                            .gotoPath(fileDir)
                            .getFile(fileName)
                            .getContent(),
                        fileString = utf8Decoder.decode(fileContent);
                    currentTerminalCore.printToWindow(
                        fileString.length === 0 ? '<EMPTY FILE>' : fileString,
                        RGBColor.black, RGBColor.turquoise
                    );
                } catch (error) {
                    currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                }
                return;
            }
            currentTerminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: printf [file_path]',
                RGBColor.red
            );
        },
        description: 'Print an existing file to the terminal window.\n' +
            'Usage: printf [file_path]'
    };

    // Finished
    _supportedCommands_['download'] = {
        is_async: true,
        executable: async (parameters) => {
            if (parameters.length === 2) {
                const tfp = currentTerminalCore.getCurrentFolderPointer().duplicate();
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
                        currentTerminalCore.printToWindow(' --> Downloaded a file.', RGBColor.green);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
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
                        currentTerminalCore.printToWindow(' --> downloaded a directory.', RGBColor.green);
                    } catch (error) {
                        currentTerminalCore.printToWindow(`${error}`, RGBColor.red);
                    }
                    return;
                }
            }
            currentTerminalCore.printToWindow(
                'Wrong grammar!\n' +
                'Usage: download -f [file_path]\n' +
                '       download -d [directory_path]',
                RGBColor.red
            );
        },
        description: 'Download a single file or a directory (as .zip file) from the terminal file system to your local machine.\n' +
            'Usage: download -f [file_path]\n' +
            '       download -d [directory_path]'
    };

    // // Update!!!
    // _supportedCommands_['ping'] = {
    //     is_async: true,
    //     executable: async (parameters) => {
    //         //
    //     },
    //     description: ''
    // }

    // // Update!!!
    // _supportedCommands_['wget'] = {
    //     is_async: true,
    //     executable: async (parameters) => {
    //         //
    //     },
    //     description: ''
    // }

    // // Update!!!
    // _supportedCommands_['zip'] = {
    //     is_async: true,
    //     executable: async (parameters) => {
    //         //
    //     },
    //     description: ''
    // }

    // // Update!!!
    // _supportedCommands_['unzip'] = {
    //     is_async: true,
    //     executable: async (parameters) => {
    //         //
    //     },
    //     description: ''
    // }

    // Update Needed
    _supportedCommands_['jstow'] = {
        executable: (parameters) => {
        },
        description: ''
    }

    // // Update Needed
    // _supportedCommands_['cpptow'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }

    // // Update Needed
    // _supportedCommands_['pytow'] = {
    //     executable: (parameters) => {
    //     },
    //     description: ''
    // }

    // Update Needed
    _supportedCommands_['wasm'] = {
        executable: (parameters) => {
        },
        description: ''
    }

    // _supportedCommands_[''] = {
    //     executable: (parameters) => {},
    //     description: ''
    // }

});

























