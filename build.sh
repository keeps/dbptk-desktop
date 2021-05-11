#!/bin/bash

#DBPTK_UI_VERSION=2.5.5
#FLOW=main | staging

# Check if FLOW is main or stating
# if is main download the .war from GitHub packages
# if is staging only downloads the JRE files
if [ "$FLOW" == "main" ]; then

    GITHUB_PACKAGES_DL_LINK="https://maven.pkg.github.com/keeps/dbptk-ui/com/databasepreservation/visualization/dbvtk/${DBPTK_UI_VERSION}/dbvtk-${DBPTK_UI_VERSION}.war "
    DBPTK_UI_WAR_TARGET="./resources/war/dbvtk.war"

    if [ ! -f $DBPTK_UI_WAR_TARGET ]; then
        echo "Downloading version ${DBPTK_UI_VERSION} from GitHub packages"
        mkdir -p "./resources/war"
        response=$(curl --write-out %{http_code} -H "Authorization: token ${GITHUB_TOKEN}" -L $GITHUB_PACKAGES_DL_LINK -o $DBPTK_UI_WAR_TARGET)
    
        if [ "${response}" != "200" ]; then
            rm -rf ${DBPTK_UI_WAR_TARGET}
            echo "Error! version does not exist in Github"
            exit 1;
        fi
    fi
fi

#Download JRE from adoptopenjdk for Releases
OS=("windows" "linux" "mac")

for os in "${OS[@]}"; do
    ARCH=("x64")
    ext="tar.gz"

    if [[ ${os} == "windows" ]]; then
        ARCH=("x64" "ia32")
        ext="zip"
    fi

    for arch in "${ARCH[@]}"; do
        JRE="https://api.adoptopenjdk.net/v2/binary/releases/openjdk8?openjdk_impl=hotspot&os=${os}&arch=${arch}&release=latest&type=jre"
        JRE_FOLDER="./resources/jre/${os}/${arch}"
        JRE_TARGET="${JRE_FOLDER}/jre1.8.${ext}"

        if [[ ${os} == "windows" ]] && [[ ${arch} == "ia32" ]]; then
            JRE="https://api.adoptopenjdk.net/v2/binary/releases/openjdk8?openjdk_impl=hotspot&os=${os}&arch=x32&release=latest&type=jre"
        fi

        if [ ! -d "$JRE_FOLDER" ]; then
            mkdir -p "${JRE_FOLDER}"
            response=$(curl --write-out %{http_code} -L $JRE -o $JRE_TARGET)
        
            if [ "${response}" != "200" ]; then
                echo "Error downloading Java"
                exit 1;
            fi

            if [[ ${os} == "windows" ]]; then
                unzip ${JRE_TARGET} -d ${JRE_FOLDER} > /dev/null 2>&1
                mv "${JRE_FOLDER}/jdk"*"/"* ${JRE_FOLDER}
            else
                tar -xvf ${JRE_TARGET} -C ${JRE_FOLDER} --strip-components=1 > /dev/null 2>&1
            fi

            rm -rf $JRE_TARGET
        fi
    done
done