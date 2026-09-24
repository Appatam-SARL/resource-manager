# Définition de recommandations pour les contributeurs de dépôt

Vous pouvez créer des instructions pour expliquer comment les personnes doivent contribuer à votre projet.

## À propos des recommandations relatives aux contributions

Pour aider les contributeurs de votre projet à faire du bon travail, vous pouvez ajouter un fichier contenant des recommandations relatives aux contributions à la racine, au dossier `docs` ou au dossier `.github` du dépôt de votre projet. Quand quelqu'un ouvre une pull request ou crée un ticket, il verra un lien vers ce fichier.
Le lien vers les instructions de contribution s’affiche également sur la page de `contribute` votre dépôt. Pour obtenir un `contribute` exemple de page, consultez [github/docs/contribute](https://github.com/github/docs/contribute).

Si votre dépôt inclut un `CONTRIBUTING.md` fichier, GitHub il est également exposé à deux autres emplacements pour faciliter la découverte des contributeurs :

* Onglet «<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-people" aria-label="people" role="img"><path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z"></path></svg> Contribution » dans la vue d’ensemble du référentiel (en regard de «<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-book" aria-label="book" role="img"><path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z"></path></svg> README » et «<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-code-of-conduct" aria-label="code-of-conduct" role="img"><path d="M8.048 2.241c.964-.709 2.079-1.238 3.325-1.241a4.616 4.616 0 0 1 3.282 1.355c.41.408.757.86.996 1.428.238.568.348 1.206.347 1.968 0 2.193-1.505 4.254-3.081 5.862-1.496 1.526-3.213 2.796-4.249 3.563l-.22.163a.749.749 0 0 1-.895 0l-.221-.163c-1.036-.767-2.753-2.037-4.249-3.563C1.51 10.008.007 7.952.002 5.762a4.614 4.614 0 0 1 1.353-3.407C3.123.585 6.223.537 8.048 2.24Zm-1.153.983c-1.25-1.033-3.321-.967-4.48.191a3.115 3.115 0 0 0-.913 2.335c0 1.556 1.109 3.24 2.652 4.813C5.463 11.898 6.96 13.032 8 13.805c.353-.262.758-.565 1.191-.905l-1.326-1.223a.75.75 0 0 1 1.018-1.102l1.48 1.366c.328-.281.659-.577.984-.887L9.99 9.802a.75.75 0 1 1 1.019-1.103l1.384 1.28c.295-.329.566-.661.81-.995L12.92 8.7l-1.167-1.168c-.674-.671-1.78-.664-2.474.03-.268.269-.538.537-.802.797-.893.882-2.319.843-3.185-.032-.346-.35-.693-.697-1.043-1.047a.75.75 0 0 1-.04-1.016c.162-.191.336-.401.52-.623.62-.748 1.356-1.637 2.166-2.417Zm7.112 4.442c.313-.65.491-1.293.491-1.916v-.001c0-.614-.088-1.045-.23-1.385-.143-.339-.357-.633-.673-.949a3.111 3.111 0 0 0-2.218-.915c-1.092.003-2.165.627-3.226 1.602-.823.755-1.554 1.637-2.228 2.45l-.127.154.562.566a.755.755 0 0 0 1.066.02l.794-.79c1.258-1.258 3.312-1.31 4.594-.032.396.394.792.791 1.173 1.173Z"></path></svg> Code de conduite »)
* Lien « Contribution » dans la barre latérale du référentiel

Pour le propriétaire du dépôt, les recommandations relatives aux contributions sont un moyen de décrire la façon dont les utilisateurs doivent apporter leur contribution.

Pour les contributeurs, les recommandations sont un moyen de vérifier qu’ils soumettent des pull requests bien formées et qu’ils ouvrent des problèmes pertinents.

Pour les propriétaires comme pour les contributeurs, les recommandations relatives aux contributions permettent de gagner du temps et de réduire les tracas liés aux demandes de tirage mal créées, ou aux problèmes qui doivent être rejetés et soumis à nouveau.

Vous pouvez créer des instructions de contribution par défaut pour votre organisation ou votre compte personnel. Pour plus d’informations, consultez « [Création d’un fichier d’intégrité de la communauté par défaut](/fr/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) ».

> \[!TIP]
> Les responsables de la gestion d’un référentiel peuvent définir des recommandations spécifiques aux problèmes en créant un modèle de problème ou de demande de tirage pour le référentiel. Pour plus d’informations, consultez « [À propos des modèles de problème et de demande de tirage](/fr/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates) ».

## Ajout d’un fichier `CONTRIBUTING.md`

1. Sur GitHub, accédez à la page principale du référentiel.

2. Au-dessus de la liste des fichiers, sélectionnez le menu déroulant **Ajouter un fichier** <svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-triangle-down" aria-label="The downwards-facing triangle icon" role="img"><path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path></svg>, puis cliquez sur **<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-plus" aria-label="plus" role="img"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path></svg> Créer un nouveau fichier**.

   Vous pouvez également cliquer sur <svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-plus" aria-label="The plus sign icon" role="img"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path></svg> dans l’arborescence de fichiers à gauche.

   ![Capture d’écran de la page principale d’un référentiel mettant en évidence l’icône « Ajouter un fichier » et l’icône « signe plus », décrites ci-dessus, avec un contour orange.](/assets/images/help/repository/add-file-buttons.png)

3. Déterminez si vous souhaitez stocker vos recommandations relatives aux contributions à la racine, dans le répertoire `docs` ou dans le répertoire `.github` de votre dépôt. Tapez ensuite dans le champ du nom de fichier, le nom et l’extension du fichier. Les noms de fichiers des recommandations relatives aux contributions ne respectent pas la casse. Les fichiers sont affichés au format RTF si l’extension de fichier est dans un format pris en charge. Pour plus d’informations, consultez « [Travailler avec des fichiers non basés sur du code](/fr/repositories/working-with-files/using-files/working-with-non-code-files#rendering-differences-in-prose-documents) ».
   * Pour rendre vos recommandations relatives aux contributions visibles dans le répertoire racine du dépôt, tapez *CONTRIBUTING*.
   * Pour rendre vos recommandations relatives aux contributions visibles dans le répertoire `docs` du dépôt, tapez *docs/* pour créer le répertoire, puis *CONTRIBUTING*.
   * Si un dépôt contient plusieurs fichiers *CONTRIBUTING*, le fichier affiché dans les liens est choisi parmi les emplacements suivants dans cet ordre : répertoire `.github`, puis répertoire racine du dépôt et enfin répertoire `docs`.

4. Dans le nouveau fichier, ajoutez des recommandations relatives aux contributions. Vous pouvez inclure ce qui suit :
   * Étapes permettant de créer des problèmes ou des demandes de tirage utiles.
   * Liens vers de la documentation externe, des listes de diffusion ou un code de conduite.
   * Attentes liées à la communauté et au comportement.

5. Cliquez sur **Commiter les changements**.

6. Dans le champ de message de validation, tapez un message de validation court et descriptif qui indique la modification que vous avez apportée au fichier. Vous pouvez attribuer la validation à plusieurs auteurs dans le message de validation. Pour plus d’informations, consultez « [Créer un commit avec plusieurs auteurs ou au nom d’une organisation](/fr/pull-requests/how-tos/commit-changes/creating-a-commit-with-multiple-authors) ».

7. Sous les champs de message de commit, choisissez si vous souhaitez ajouter votre commit à la branche actuelle ou à une nouvelle branche. Si votre branche actuelle est la branche par défaut, vous devez choisir de créer une nouvelle branche pour y effectuer votre commit, puis créer une pull request. Pour plus d’informations, consultez « [Création d’une pull request](/fr/pull-requests/how-tos/create-pull-requests/creating-a-pull-request) ».

   ![Capture d’écran d’une pull request GitHub montrant un bouton radio permettant soit de valider directement sur la branche main, soit de créer une nouvelle branche. Une nouvelle branche est sélectionnée.](/assets/images/help/repository/choose-commit-branch.png)

8. Cliquez sur **Valider les modifications** ou **Proposer des modifications**.

## Exemples de recommandations relatives aux contributions

Si vous êtes perplexe, voici quelques bons exemples de recommandations relatives aux contributions :

* Recommandations en matière de GitHub Docs[contribution](/fr/contributing).
* [Recommandations relatives aux contributions](https://github.com/rails/rails/blob/main/CONTRIBUTING.md) pour Ruby on Rails.
* [Recommandations relatives aux contributions](https://github.com/opengovernment/opengovernment/blob/master/CONTRIBUTING.md) pour OpenGovernment.

## Pour aller plus loin

* Section des Guides Open Source [Commencer un projet Open Source](https://opensource.guide/starting-a-project/)
* [GitHub Skills](https://skills.github.com/)
* [Ajout d’une licence à un dépôt](/fr/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository)
