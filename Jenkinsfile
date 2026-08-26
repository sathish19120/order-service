pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "sathishsiddamsetty/order-service"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        REGISTRY_CREDENTIALS = "dockerhub-creds"
        GIT_CREDENTIALS = "Github-Token-sathish19120"
        SONAR_SCANNER_HOME = tool 'SonarScanner'
    }

    stages {
        stage('Check Commit Author') {
            steps {
                script {
                    def author = sh(
                        script: "git log -1 --pretty=format:%an",
                        returnStdout: true
                    ).trim()
                    echo "Commit author: ${author}"
                    if (author == 'sathish19120') {
                        currentBuild.result = 'NOT_BUILT'
                        error("Jenkins own commit — skipping pipeline")
                    }
                }
            }
        }
        stage('Install Dependencies & Run Tests') {
    steps {
        sh """
            npm install
            npm test
        """
    }
}

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh """
                        ${SONAR_SCANNER_HOME}/bin/sonar-scanner \
                        -Dsonar.projectKey=order-service \
                        -Dsonar.sources=src \
                        -Dsonar.host.url=http://sonarqube:9000
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo 'SonarQube analysis submitted'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:${IMAGE_TAG} ."
            }
        }
        stage('Trivy Security Scan') {
    steps {
        sh """
            trivy image --severity HIGH,CRITICAL --exit-code 0 \
            --format table ${DOCKER_IMAGE}:${IMAGE_TAG}
        """
    }
}

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${REGISTRY_CREDENTIALS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                        docker push ${DOCKER_IMAGE}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Update Manifest for ArgoCD') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${GIT_CREDENTIALS}",
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_PASS')]) {
                    sh """
                        git config user.email "ci@jenkins.local"
                        git config user.name "jenkins-ci"
                        git fetch origin main
                        git checkout -B main origin/main
                        sed -i 's|image: .*|image: ${DOCKER_IMAGE}:${IMAGE_TAG}|' k8s/deployment.yaml
                        git add k8s/deployment.yaml
                        git commit -m "Update image to ${IMAGE_TAG} [skip ci]" || echo "No changes"
                        git push https://${GIT_USER}:${GIT_PASS}@github.com/sathish19120/order-service.git HEAD:main
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded — image ${DOCKER_IMAGE}:${IMAGE_TAG} deployed"
        }
        failure {
            echo "Pipeline failed"
        }
    }
}
