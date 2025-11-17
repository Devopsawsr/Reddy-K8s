# Create alias for current session
alias k=kubectl

# Make it permanent - add to ~/.bashrc
echo "alias k=kubectl" >> ~/.bashrc
source ~/.bashrc

# Or add to ~/.bash_profile
echo "alias k=kubectl" >> ~/.bash_profile
source ~/.bash_profile
