#!/bin/bash

#Check if build is for Master or Release
if [ "`echo $TRAVIS_BRANCH | egrep "^v[1-9]+" | wc -l`" -eq "1" ] || [ "$TRAVIS_BRANCH" == "master" ]; then
    #Get DBVTK version from package.json (dbvtkVersion)
    if [ -z "$DBVTK_VERSION" ]; then
        DBVTK_VERSION=$(cat package.json \
        | grep dbvtkVersion \
        | head -1 \
        | awk -F: '{ print $2 }' \
        | sed 's/[",]//g' \
        | tr -d '[[:space:]]')
    fi

    echo "Logic for tags"
    DBVTK="dbvtk-${DBVTK_VERSION}.war"
    DEPLOY="master"
else
    #For Dev Branch
    echo "Logic for staging"
    DBVTK="dbvtk-staging.war"
    #DEPLOY="staging"
    DEPLOY="master"
fi

echo $DBVTK
BINTRAY="https://dl.bintray.com/keeps/db-visualization-toolkit/${DBVTK}"
DBVTK_TARGET="./resources/war/dbvtk.war"

#Download dbvtk package from bintray
if [ ! -f $DBVTK_TARGET ]; then
    echo "Downloading ${DBVTK} from bintray"
    mkdir -p "./resources/war"
    response=$(curl --write-out %{http_code} -L $BINTRAY -o $DBVTK_TARGET)
    
    if [ "${response}" != "200" ]; then
        echo "Error! version does not exist in Bintray"
        exit 1;
    fi
fi

#Download JRE from adoptopenjdk for Releases
if [ "$DEPLOY" == "master" ]; then
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
fi