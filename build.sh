#!/bin/bash

#DBPTK_UI_VERSION=3.0.0
#FLOW=main | staging

function verify_checksum() {
    # args: os, image_type, architecture, jvm_impl, checksum
    OS=$1
    IMAGE_TYPE=$2
    ARCH=$3
    JVM_IMPL=$4
    HEAP_SIZE="normal"
    DL_CHECKSUM=$5
    API_CHECKSUM_FILE=/tmp/assets.json

    if [[ ${ARCH} == "arm64" ]]; then
        ARCH="aarch64"
    fi 

    rm -f $API_CHECKSUM_FILE

    RESPONSE=$(curl --write-out %{http_code} https://api.adoptium.net/v3/assets/latest/21/hotspot -o $API_CHECKSUM_FILE)
    if [ "${RESPONSE}" != "200" ]; then
        echo "Failed to get asset information"
        return 1
    fi

    if [ ! -f "$API_CHECKSUM_FILE" ]; then
        echo "Failed to write cURL result to temporary file"
        return 1
    fi

    API_CHECKSUM=$(cat $API_CHECKSUM_FILE | jq -r --arg os $OS --arg jvm_impl $JVM_IMPL --arg arch $ARCH --arg image_type $IMAGE_TYPE --arg heap_size $HEAP_SIZE '.[].binary | select(.image_type == $image_type) | select(.heap_size == $heap_size) | select(.architecture == $arch) | select(.jvm_impl == $jvm_impl) | select(.os == $os) | .package.checksum')

    if [ $API_CHECKSUM == $DL_CHECKSUM ]; then
        return 0
    else
        return 1
    fi
}

# Check if FLOW is main or stating
# if is main download the .war from GitHub packages
# if is staging only downloads the JRE files
if [ "$FLOW" == "main" ]; then

    GITHUB_PACKAGES_DL_LINK="https://maven.pkg.github.com/keeps/dbptk-ui/com/databasepreservation/visualization/dbvtk/${DBPTK_UI_VERSION}/dbvtk-${DBPTK_UI_VERSION}.war"
    DBPTK_UI_WAR_TARGET="./resources/war/dbvtk.war"

    if [ ! -f $DBPTK_UI_WAR_TARGET ]; then
        echo "Downloading version ${DBPTK_UI_VERSION} from GitHub packages"
        mkdir -p "./resources/war"
        response=$(curl --write-out %{http_code} -H "Authorization: token ${GITHUB_TOKEN}" -L $GITHUB_PACKAGES_DL_LINK -o $DBPTK_UI_WAR_TARGET)

        if [ "${response}" != "200" ]; then
            rm -rf ${DBPTK_UI_WAR_TARGET}
            echo "Error! version does not exist in Github"
            exit 1
        fi
    fi
fi

#Download JRE from adoptopenjdk for Releases
OS=("windows" "linux" "mac")

for os in "${OS[@]}"; do
    ARCH=("x64")
    ext="tar.gz"

    if [[ ${os} == "windows" ]]; then
        ARCH=("x64")
        ext="zip"
    fi

    if [[ ${os} == "mac" ]]; then
        ARCH=("x64" "aarch64")
    fi

    for arch in "${ARCH[@]}"; do
        JRE="https://api.adoptium.net/v3/binary/latest/21/ga/${os}/${arch}/jre/hotspot/normal/adoptium?project=jdk"

        if [[ ${arch} == "aarch64" ]]; then
            arch="arm64"
        fi
        
        JRE_FOLDER="./resources/jre/${os}/${arch}"
        JRE_TARGET="${JRE_FOLDER}/jre21.${ext}"
        if [ ! -d "$JRE_FOLDER" ]; then
            mkdir -p "${JRE_FOLDER}"
            response=$(curl --write-out %{http_code} -L $JRE -o $JRE_TARGET)

            if [ "${response}" != "200" ]; then
                echo "Failed to download JRE ($os). HTTP code: ${response}"
                exit 1
            fi

            if [ "${RUNNER_OS}" == "macOS" ]; then
                DL_CHECKSUM=$(shasum -a 256 $JRE_TARGET)
            else
                DL_CHECKSUM=$(sha256sum $JRE_TARGET)
            fi
            
            if verify_checksum $os "jre" $arch "hotspot" $DL_CHECKSUM; then
                echo "Checksum verification passed"
            else
                echo "Downloaded JRE and expected checksum doesn't match"
                exit 1
            fi

            if [[ ${os} == "windows" ]]; then
                unzip ${JRE_TARGET} -d ${JRE_FOLDER} >/dev/null 2>&1
                mv "${JRE_FOLDER}/jdk"*"/"* ${JRE_FOLDER}
            else
                tar -xvf ${JRE_TARGET} -C ${JRE_FOLDER} --strip-components=1 >/dev/null 2>&1
            fi

            rm -rf $JRE_TARGET
        fi
    done
done

# SOLR
SOLR_VERSION=9.8.0
SOLR_URL="https://www.apache.org/dyn/closer.lua/solr/solr/${SOLR_VERSION}/solr-${SOLR_VERSION}-slim.tgz?action=download"

SOLR_FOLDER="./resources/solr"
mkdir -p "${SOLR_FOLDER}"

# Download the Solr version
echo "Downloading Solr from $SOLR_URL..."

response=$(curl --write-out %{http_code} -L "${SOLR_URL}" -o "${SOLR_FOLDER}/solr.tgz")
if [ "${response}" != "200" ]; then
    echo "Failed to download Solr. HTTP code: ${response}"
    exit 1
fi

# Extract the downloaded file to the target directory
echo "Extracting Solr to $SOLR_FOLDER..."
tar -xzf "${SOLR_FOLDER}/solr.tgz" -C $SOLR_FOLDER --strip-components=1

rm -f "${SOLR_FOLDER}/solr.tgz"