# Lumen's build toolchain, all installed under your home folder — nothing
# system-wide, nothing that needed an admin password.
#
#   source tools/env.sh
#
# To have it always available, add the same three lines to ~/.zshrc.

export PATH="$HOME/.local/node/bin:$PATH"
export JAVA_HOME="$HOME/.local/jdk21/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
