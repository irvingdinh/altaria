#!/usr/bin/env bash
# Altaria Shell Integration for Bash
# Based on VS Code shell integration patterns

if [[ "$TERM_PROGRAM" != "altaria" ]]; then
    return
fi

__altaria_escape_value() {
    local value="$1"
    value="${value//\\/\\\\}"
    value="${value//;/\\x3b}"
    printf '%s' "$value"
}

__altaria_prompt_start() {
    builtin printf '\e]633;A\a'
}

__altaria_prompt_end() {
    builtin printf '\e]633;B\a'
}

__altaria_command_output_start() {
    if [[ -n "$__altaria_current_command" ]]; then
        builtin printf '\e]633;E;%s\a' "$(__altaria_escape_value "$__altaria_current_command")"
    fi
    builtin printf '\e]633;C\a'
}

__altaria_command_complete() {
    local status="$__altaria_status"
    builtin printf '\e]633;D;%s\a' "$status"
    builtin printf '\e]633;P;Cwd=%s\a' "$(__altaria_escape_value "$PWD")"
}

__altaria_update_cwd() {
    builtin printf '\e]633;P;Cwd=%s\a' "$(__altaria_escape_value "$PWD")"
}

__altaria_status=0
__altaria_current_command=""

__altaria_preexec() {
    __altaria_status="$?"
    __altaria_current_command="$1"
    __altaria_command_output_start
}

__altaria_precmd() {
    __altaria_status="$?"
    __altaria_command_complete
    __altaria_current_command=""
}

if [[ -z "${bash_preexec_imported:-}" ]]; then
    __altaria_original_PS1="$PS1"
    PS1="\[$(__altaria_prompt_start)\]$PS1\[$(__altaria_prompt_end)\]"
    
    __altaria_original_PROMPT_COMMAND="${PROMPT_COMMAND:-}"
    PROMPT_COMMAND="__altaria_precmd${__altaria_original_PROMPT_COMMAND:+;$__altaria_original_PROMPT_COMMAND}"
    
    trap '__altaria_preexec "$BASH_COMMAND"' DEBUG
fi

__altaria_update_cwd
