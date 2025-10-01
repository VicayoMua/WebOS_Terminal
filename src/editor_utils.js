function openFileEditor(
    HTMLDivForTerminalWindow,
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
        const aceEditorObject = ace.edit(divAceEditorContainer); // Create Ace editor in the div container
        aceEditorObject.setValue(orginalFileContent);  // Set the initial content of the file
        aceEditorObject.setOptions({
            fontSize: "14px",   // Set font size
            showPrintMargin: false, // Disable the print margin
        });
        aceEditorObject.focus();
        divAceEditorWindow.appendChild(divAceEditorContainer);

        // exit buttons
        const divExitButtons = document.createElement('div');
        divExitButtons.classList.add('ace-editor-exit-buttons-container');
        {
            const minimizeButton = document.createElement('button');
            minimizeButton.classList.add('ace-editor-minimize-button');
            minimizeButton.innerText = `🔽 Minimize`;
            minimizeButton.onclick = () => {
                callbackToRecoverMinimizedWindow(`Editing File: ${fileName}`, divAceEditorWindow, aceEditorObject); // giving out info to recover the window
                divAceEditorWindow.style.display = 'none'; // hide but not remove
            };
            divExitButtons.appendChild(minimizeButton);

            const saveButton = document.createElement('button');
            saveButton.classList.add('ace-editor-save-button');
            saveButton.innerText = '💾 Save';
            saveButton.onclick = () => {
                callbackToSaveFile(aceEditorObject.getValue());
                divAceEditorWindow.remove();
            };
            divExitButtons.appendChild(saveButton);

            const cancelButton = document.createElement('button');
            cancelButton.classList.add('ace-editor-cancel-button');
            cancelButton.innerText = '✖ Cancel';
            cancelButton.onclick = () => {
                callbackToCancelEdit();
                divAceEditorWindow.remove();
            };
            divExitButtons.appendChild(cancelButton);
        }
        divAceEditorWindow.appendChild(divExitButtons);
    }
    HTMLDivForTerminalWindow.appendChild(divAceEditorWindow);
}

// // Resize handle (bottom-right corner)
// const resizeHandle = document.createElement('div');
// resizeHandle.style.position = 'absolute';
// resizeHandle.style.right = '5px';
// resizeHandle.style.bottom = '5px';
// resizeHandle.style.width = '15px';
// resizeHandle.style.height = '15px';
// resizeHandle.style.backgroundColor = '#888';
// resizeHandle.style.cursor = 'se-resize'; // Indicates it's for resizing
// // Function to handle resizing
// let isResizing = false;
// let lastDownX = 0;
// let lastDownY = 0;
//
// function resizeWindow(e) {
//     if (!isResizing) return;
//     const dx = e.clientX - lastDownX;
//     const dy = e.clientY - lastDownY;
//
//     const newWidth = divAceEditorWindowContainer.offsetWidth + dx;
//     const newHeight = divAceEditorWindowContainer.offsetHeight + dy;
//
//     // Update the width and height of the editor window
//     divAceEditorWindowContainer.style.width = `${newWidth}px`;
//     divAceEditorWindowContainer.style.height = `${newHeight}px`;
//
//     lastDownX = e.clientX;
//     lastDownY = e.clientY;
// }
//
// resizeHandle.addEventListener('mousedown', (e) => {
//     e.preventDefault(); // Prevent text selection while resizing
//     isResizing = true;
//     lastDownX = e.clientX;
//     lastDownY = e.clientY;
//
//     // Mousemove listener to adjust the window size
//     document.addEventListener('mousemove', resizeWindow, false);
//
//     // Mouseup listener to stop resizing
//     document.addEventListener('mouseup', () => {
//         isResizing = false;
//         document.removeEventListener('mousemove', resizeWindow, false);
//     }, false);
// });
// divAceEditorWindowContainer.appendChild(resizeHandle);