#!/bin/bash

# Get a list of signing identities, excluding revoked ones and the line displaying the count of valid identities
identities=$(security find-identity -v -p codesigning | grep -v "CSSMERR_TP_CERT_REVOKED" | grep -v "valid identities found" | cut -d ')' -f 2-)

# If no valid identities found, exit
if [ -z "$identities" ]; then
    echo "No valid signing identities found."
    exit 1
fi

# Convert identities to an array (one entry per line)
IFS=$'\n' read -d '' -r -a identities_array <<< "$identities"

# Prompt user to select a signing identity
echo "Please select a signing identity:"
select identity in "${identities_array[@]}"; do
    if [[ -n $identity ]]; then
        echo "You selected: $identity"
        break
    else
        echo "Invalid selection"
    fi
done

# Extract the certificate identifier from the selected identity
cert_id=$(echo "$identity" | awk '{print $1}')

# Update CSC_NAME environment variable
export CSC_NAME="$cert_id"

# Optionally: Update a configuration file or script with the new CSC_NAME value
# echo "export CSC_NAME=\"$cert_id\"" >> ~/.bash_profile

echo "CSC_NAME environment variable has been set to: $CSC_NAME"

nx make desktop-electron
