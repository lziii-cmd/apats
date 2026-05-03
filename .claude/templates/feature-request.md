# Demande de fonctionnalité

> Copie ce template, remplis les sections, colle le résultat dans le chat.
> Plus tu es précis, meilleur sera le plan d'impact que Claude produira.
> Les sections marquées (optionnel) peuvent être omises si non pertinent.

---

## Nom court de la fonctionnalité

[Ex : "Ajouter l'export CSV des emprunts"]

## Description

[En 2-5 phrases : qu'est-ce que c'est, pour qui, dans quel contexte d'usage.]

## Comportement attendu

[Décrire le comportement utilisateur final, étape par étape si pertinent.
Ex :
1. L'utilisateur clique sur "Exporter".
2. Une boîte de dialogue propose la période et le format.
3. Le fichier se télécharge.]

## Cas limites & gestion d'erreurs

[Quels cas particuliers veux-tu gérer ? Que doit-il se passer en cas
d'échec ? Quelles validations attends-tu ?
Ex :
- Période > 1 an → message "période trop longue"
- Aucune donnée → fichier vide avec en-têtes uniquement
- Erreur serveur → toast d'erreur + retry possible]

## Contraintes techniques (optionnel)

[Choses à respecter ou éviter, technologies imposées, intégrations à utiliser.
Ex :
- Doit utiliser la lib XYZ déjà présente
- Pas d'appel synchrone bloquant
- Doit fonctionner offline]

## Critères d'acceptation

[Comment tu sauras que c'est terminé. Liste vérifiable.
Ex :
- [ ] Le fichier CSV contient les colonnes id, user, doc, date_emprunt, date_retour
- [ ] L'export fonctionne pour au moins 10 000 lignes
- [ ] Tests automatisés passent
- [ ] Documenté dans le README]

## Priorité

[Haute / Moyenne / Basse — et pourquoi]

## Mode (optionnel)

[Laisser vide pour classification automatique. Sinon :
- `mode strict` → forcer le pipeline complet (utile si la tâche semble petite mais touche un domaine sensible)
- `mode rapide` → demander la voie rapide (refusé automatiquement sur auth, paiement, DB, sécurité)]

## Contexte additionnel (optionnel)

[Ce qui pourrait aider Claude à mieux comprendre : références à du code
existant, lien vers une issue, capture d'écran, contraintes business.]
