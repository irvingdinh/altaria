#!/usr/bin/env zsh
# Altaria Shell Integration for Zsh
# Based on VS Code shell integration patterns

if [[ "$TERM_PROGRAM" != "altaria" ]]; then
    return
fi

__altaria_escape_value() {
    local value="$1"
    value="${value//\\/\\\\}"
    value="${value//;/\\x3b}"
    echo -n "$value"
}

__altaria_prompt_start() {
    builtin printf '\e]633;A\a'
}

__altaria_prompt_end() {
    builtin printf '\e]633;B\a'
}

__altaria_command_output_start() {
    builtin printf '\e]633;E;%s\a' "$(__altaria_escape_value "$__altaria_current_command")"
    builtin printf '\e]633;C\a'
}

__altaria_command_complete() {
    builtin printf '\e]633;D;%s\a' "$__altaria_status"
    builtin printf '\e]633;P;Cwd=%s\a' "$(__altaria_escape_value "$PWD")"
}

__altaria_update_cwd() {
    builtin printf '\e]633;P;Cwd=%s\a' "$(__altaria_escape_value "$PWD")"
}

__altaria_status=0
__altaria_current_command=""

__altaria_preexec() {
    __altaria_current_command="$1"
    __altaria_command_output_start
}

__altaria_precmd() {
    __altaria_status="$?"
    __altaria_command_complete
    __altaria_current_command=""
}

autoload -Uz add-zsh-hook

add-zsh-hook precmd __altaria_precmd
add-zsh-hook preexec __altaria_preexec

PS1="%{$(__altaria_prompt_start)%}${PS1}%{$(__altaria_prompt_end)%}"

__altaria_update_cwd
