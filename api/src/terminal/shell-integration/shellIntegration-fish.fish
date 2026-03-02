# Altaria Shell Integration for Fish
# Based on VS Code shell integration patterns

if test "$TERM_PROGRAM" != "altaria"
    exit 0
end

function __altaria_escape_value
    set -l value $argv[1]
    string replace -a '\\' '\\\\' -- $value | string replace -a ';' '\\x3b'
end

function __altaria_prompt_start --on-event fish_prompt
    printf '\e]633;A\a'
end

function __altaria_prompt_end --on-event fish_prompt
    printf '\e]633;B\a'
end

function __altaria_preexec --on-event fish_preexec
    set -g __altaria_current_command $argv[1]
    printf '\e]633;E;%s\a' (__altaria_escape_value "$__altaria_current_command")
    printf '\e]633;C\a'
end

function __altaria_postexec --on-event fish_postexec
    set -l status_code $status
    printf '\e]633;D;%s\a' $status_code
    printf '\e]633;P;Cwd=%s\a' (__altaria_escape_value "$PWD")
end

function __altaria_update_cwd
    printf '\e]633;P;Cwd=%s\a' (__altaria_escape_value "$PWD")
end

__altaria_update_cwd
