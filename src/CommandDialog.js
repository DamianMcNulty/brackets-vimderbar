/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50*/
/*global define, $, brackets, Mustache*/

// Handles status bar interactions 
define(function (require, exports) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager"),
        CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        ExCommandHistory = require("./ExCommandHistory"),
        cm,
        callback,
        $dialog,
        $input,
        inHistory;
   
    /**
     * Update vim mode and set status bar
     */
    function updateMode(event) {
        CodeMirror.updateVimStatus(event.mode);
    }
    /**     
     * Attach Vim functions to current CodeMirror instance,
     * add watch for mode changes on current instance.
     * @param {CodeMirror} _cm The current CodeMirror instance.
     */
    function attachVimderbar(cm) {
        // this should use CodeMirror.defineExtension but
        // we're too late to change the prototype when Dialog is loaded
        cm.openDialog = CodeMirror.openDialog;
        cm.updateVimStatus = CodeMirror.updateVimStatus;
        cm.clearVimCommandKeys = CodeMirror.clearVimCommandKeys;
        cm.getVimCommandKeys = CodeMirror.getVimCommandKeys;
        cm.updateVimCommandKeys = CodeMirror.updateVimCommandKeys;

        cm.off("vim-mode-change", updateMode);
        cm.on("vim-mode-change", updateMode);
    }
    /**     
     * Setup Vim status bar, hook events and setup ExCommand history.
     * @param {CodeMirror} _cm The current CodeMirror instance.
     */
    function init(_cm) {
        cm = _cm;
        attachVimderbar(cm);
        $dialog = $("#vimderbar");
        $input = $dialog.children(".vimderbar-command");
        $input.off("keydown");
        $input.on("keydown", function (e) {
            var keyName = CodeMirror.keyName(e);
            var commandVal = $input.val();
            if (keyName === "Up" || keyName === "Down") {
                if (!inHistory && commandVal !== "") {
                    // stash current command if exists so you can get back to it
                    ExCommandHistory.add(commandVal);
                }
                if (keyName === "Up") {
                    $input.val(ExCommandHistory.getPrevHistoryItem());
                } else {
                    $input.val(ExCommandHistory.getNextHistoryItem());
                }
                inHistory = true;
            } else if (e.keyCode === 13 || keyName === "Enter") {
                CodeMirror.e_stop(e);
                ExCommandHistory.add(commandVal);
                callback(commandVal);
                $input.blur();
            } else if (keyName === "Esc" || keyName === "Ctrl-C" || keyName === "Ctrl-[") {
                // CodeMirror.e_stop(e);
                $input.blur();
            }
        });
        $input.off("blur");
        $input.on("blur", function () {
            $input.val("");
            $input.hide();
            $dialog.children(".vimderbar-command-sign").text("");
            $dialog.children(".vimderbar-mode").show();
            inHistory = false;
            ExCommandHistory.exitHistory();
            cm.focus();
        });
        ExCommandHistory.init();
        cm.focus();
    }
    /**
     * Wipe out project command history.
     */
    function resetHistory() {
        // TODO: clean out localStorage
        ExCommandHistory.resetHistory();
    }
    /**
     * Open command dialog overlay in status bar.
     * @param {String} template Template HTML for dialog, generated by CodeMirror Dialog.
     */
    function openDialog(template, _callback, options) {
        callback = _callback;
        // grab shortText out of the provided template
        // TODO: this could be brittle, is the template format going to change?
        var shortText = $(Mustache.render(template))[0].innerHTML;
        if (shortText === null) { // dealing with Macros
            $dialog.children(".vimderbar-mode").html(template);
            return;
        }
        if (typeof options.value !== "undefined") {
            $input.val(options.value);
        }
        $input.show();
        $input.focus();
        $dialog.children(".vimderbar-command-sign").text(shortText[0]);
        $dialog.children(".vimderbar-mode").hide();
        return;
    }
    /**
     * Change mode in status bar.
     * @param {String} mode Current Vim mode.
     */
    function updateVimStatus(mode) {
        if ($dialog) {
            $dialog.children(".vimderbar-mode").show();
            $dialog.children(".vimderbar-mode").text("-- " + mode + " --");
        }
    }
    /**
     * Add key to command status so user knows what they are typing.
     * @param {String} key Text to be appended to current command.
     */
    function updateVimCommandKeys(key) {
        if (key !== "?") {
            $dialog.children(".vimderbar-command-keys").append(key);
        }
    }
    /**
     * Get current command from status bar.
     */
    function getVimCommandKeys() {
        return $dialog.children(".vimderbar-command-keys").text();
    }
    /**
     * Clear current command from status bar.
     */
    function clearVimCommandKeys() {
        $dialog.children(".vimderbar-command-keys").text("");
    }

    CodeMirror.openDialog = openDialog;
    CodeMirror.updateVimStatus = updateVimStatus;
    CodeMirror.updateVimCommandKeys = updateVimCommandKeys;
    CodeMirror.getVimCommandKeys = getVimCommandKeys;
    CodeMirror.clearVimCommandKeys = clearVimCommandKeys;

    exports.init = init;
    exports.resetHistory = resetHistory;
});