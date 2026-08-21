#!/usr/bin/env bash

install_latest_composer() {
    local install_dir="$HOME/.local/bin"
    local temp_dir installer expected_checksum actual_checksum php_bin

    php_bin="$(mise which php)"
    temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/composer-setup.XXXXXX")"
    installer="$temp_dir/composer-setup.php"

    expected_checksum="$(curl -fsSL https://composer.github.io/installer.sig)"
    curl -fsSL https://getcomposer.org/installer -o "$installer"
    actual_checksum="$(shasum -a 384 "$installer" | awk '{print $1}')"

    if [[ "$actual_checksum" != "$expected_checksum" ]]; then
        rm -rf "$temp_dir"
        echo "Composer installer checksum verification failed" >&2
        return 1
    fi

    mkdir -p "$install_dir"
    "$php_bin" "$installer" --quiet --install-dir="$install_dir" --filename=composer
    rm -rf "$temp_dir"

    "$install_dir/composer" --version
}
