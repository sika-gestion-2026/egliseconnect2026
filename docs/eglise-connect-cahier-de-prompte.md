# CAHIER DE PROMPTE — ÉGLISE CONNECT
## Prompt complet de conception (à copier-coller dans un outil IA de génération d'application)

Version enrichie — Août 2026

---

## 0. COMMENT UTILISER CE DOCUMENT

Ce document est rédigé pour être collé tel quel dans un outil de génération d'application par IA (type Lovable, Bolt, v0, Replit Agent, Claude/Cursor, etc.). Il reprend le cahier des charges d'origine "Église Connect" et l'enrichit avec :
- une identité visuelle complète (couleurs, typographie, ton du design),
- un rôle **Super Admin** avec accès absolu à toute la plateforme,
- des suggestions d'amélioration fonctionnelles et techniques,
- un modèle de données mis à jour,
- des recommandations de sécurité indispensables à cause du niveau d'accès du Super Admin.

---

## 1. IDENTITÉ DU PROJET

**Nom de l'application :** Église Connect
**Pitch en une phrase :** Une plateforme numérique où chaque église dispose de son espace autonome et sécurisé pour gérer ses membres, pointer ses cultes et animer sa vie communautaire — supervisée par une administration centrale (Munokolive).
**Éditeur / opérateur de la plateforme :** Munokolive (compte Super Admin : munokolive@gmail.com)
**Cible :** pasteurs, diacres, responsables d'église, membres et visiteurs, plus une équipe d'exploitation centrale (toi, le Super Admin).

---

## 2. IDENTITÉ VISUELLE — DESIGN SYSTEM

### 2.1 Palette de couleurs

| Rôle | Couleur | Code indicatif | Usage |
|---|---|---|---|
| Bleu principal | Bleu profond royal | `#0B2E6B` à `#1B4DB1` (dégradé) | Fond d'en-têtes, boutons primaires, navigation |
| Rouge foncé | Rouge bordeaux/grenat | `#7A1626` à `#A01F2E` | Accents, alertes douces, badges "urgent"/"pastoral", CTA secondaires |
| Blanc | Blanc pur / blanc cassé | `#FFFFFF` / `#FAF8F3` | Fonds de contenu, cartes, lisibilité |
| Or | Or/doré satiné | `#C9A227` à `#E8C24D` (dégradé) | Éléments premium : badges, bordures de fiches, icônes de statut, séparateurs, mentions "Super Admin" |

**Principe directeur du design :** un mariage "sanctuaire moderne" — le bleu et le blanc évoquent la sérénité et la clarté (lumière d'un vitrail), le rouge foncé apporte la chaleur et la solennité, l'or signe le prestige et le sacré sans tomber dans le too much. Éviter tout aspect "église poussiéreuse" : viser un rendu proche d'une app fintech premium ou d'une app de gestion communautaire haut de gamme.

### 2.2 Ce qui doit "surprendre" dans le design

- **En-tête dynamique par église** : chaque espace d'église peut personnaliser une bannière (photo du lieu de culte ou motif vitrail généré) derrière un voile bleu nuit semi-transparent, avec le nom de l'église en lettres dorées.
- **Cartes membres façon "carte de membre premium"** : effet carte de fidélité/carte bancaire avec un léger reflet doré au survol, coin arrondi, photo en médaillon cerclé d'or.
- **Fil "Édification" en mode magazine** : le verset/thème de la semaine s'affiche en grand, typographie élégante sur fond bleu nuit avec liseré or, pas en simple liste de posts.
- **Badges avec micro-animation** : quand un badge "Ambassadeur" ou "Fidèle" est débloqué, léger effet de brillance dorée (shimmer) une seule fois à l'apparition.
- **Tableau de bord "vitrail"** : les indicateurs clés (présences du jour, anniversaires, classement inviteurs) présentés en mosaïque de cartes façon fragments de vitrail, séparées par de fins traits or.
- **Mode sombre "Nuit de veillée"** : fond bleu nuit quasi noir, textes blanc cassé, accents or — pensé pour un usage en soirée/culte du soir.
- **Micro-interaction pointage** : cocher un membre présent déclenche une coche animée dorée avec un léger son/vibration discret (paramétrable).

### 2.3 Typographie suggérée
- Titres : une serif élégante et solennelle (ex. style Playfair Display) en bleu profond ou or sur fond sombre.
- Corps de texte : une sans-serif très lisible (ex. style Inter/Manrope) en gris foncé/blanc selon le fond.

---

## 3. ARCHITECTURE DES RÔLES (mise à jour)

| Rôle | Portée | Accès |
|---|---|---|
| **Super Admin** (Munokolive — munokolive@gmail.com) | **Toute la plateforme, toutes les églises** | Voit et peut administrer l'intégralité des données : toutes les églises, tous les comptes, tous les membres, **tous les pointages**, **toutes les notes pastorales**, tous les contenus, toutes les statistiques. Peut créer/suspendre/supprimer un espace église, réinitialiser un accès, consulter les logs d'activité, gérer la facturation/l'abonnement de chaque église (si modèle payant), et exporter n'importe quelle donnée. |
| Pasteur / Responsable (admin d'église) | Une seule église | Comme défini dans le cahier des charges d'origine (§2) |
| Diacre / Collaborateur | Une seule église | Droits délégués par le pasteur |
| Membre | Une seule église | Consultation + pointage selon droits |
| Visiteur | Une seule église | Fiche suivi, pas nécessairement de compte |

### 3.1 Ce que change le Super Admin par rapport au cahier des charges d'origine

Le cahier des charges d'origine pose comme exigence non négociable : *"Les données de chaque église doivent rester strictement séparées de celles des autres églises"* et *"les notes pastorales ne sont visibles que par les administrateurs de l'église concernée."*

Le rôle Super Admin est une **exception volontaire et assumée** à cette règle, réservée à l'exploitant de la plateforme. C'est un choix produit légitime (support technique, modération, supervision globale), mais il doit être **encadré** pour ne pas trahir la confiance des églises utilisatrices — voir §6 ci-dessous. C'est le point le plus sensible du projet : à traiter avec soin dès la conception.

### 3.2 Fonctionnalités propres au Super Admin (à construire)

- **Console multi-églises** : liste de toutes les églises inscrites (nom, ville, nombre de membres, date de création, statut actif/suspendu).
- **Vue "loupe"** : possibilité d'entrer dans l'espace de n'importe quelle église exactement comme le ferait son pasteur (mode "voir en tant que"), pour du support ou de la supervision.
- **Statistiques globales** : nombre total d'églises, de membres, de pointages effectués, croissance dans le temps, carte de répartition géographique des églises.
- **Gestion des comptes** : création/suppression de comptes administrateurs d'église, réinitialisation de mot de passe, blocage d'un espace en cas d'abus.
- **Journal d'audit (log)** : historique de toutes les actions du Super Admin (quelle église consultée, quand, quelle action) — voir §6.
- **Gestion de contenu global** : possibilité de publier une annonce visible par toutes les églises (ex. maintenance, nouveauté).
- **Export global** : export de données à l'échelle de la plateforme (CSV/PDF) pour analyse.

---

## 4. FONCTIONNALITÉS — REPRISE ENRICHIE DU CAHIER DES CHARGES

### 4.1 Création et accès à l'espace de l'église (inchangé + amélioration)
- Formulaire de création, code d'accès unique à 5 caractères, connexion email/mot de passe.
- **Suggestion :** ajouter un QR code généré automatiquement à partir du code d'accès, affichable/imprimable pour que les nouveaux membres rejoignent l'espace en le scannant.

### 4.2 Fiche membre (inchangé + amélioration)
- Tous les champs du cahier des charges d'origine (identité, naissance, photo, profession, lieu, statut, fonctions, date d'arrivée, "amené par", note pastorale privée).
- **Suggestion :** ajouter un champ "besoin d'accompagnement" (case à cocher discrète, visible seulement des admins) pour signaler un suivi pastoral prioritaire, sans détailler la nature du besoin dans un champ public.

### 4.3 Pointage des cultes (inchangé + amélioration)
- Jours configurables, pointage par date, taux d'assiduité automatique.
- **Suggestion :** pointage rapide par recherche/scan (taper les premières lettres du nom ou scanner la carte membre) pour accélérer le pointage un dimanche avec beaucoup de monde.
- **Suggestion :** alerte automatique "absence prolongée" (ex. un membre régulier absent 3 dimanches de suite) visible sur le tableau de bord des admins d'église — utile pour le suivi pastoral, prévu en V2 dans le cahier d'origine, mais peut être anticipé en V1 en version simple.

### 4.4 Annuaire et profil détaillé (inchangé + amélioration)
- Trombinoscope, profil complet, badges automatiques (Nouveau, Fidèle, Ambassadeur).
- **Suggestion de badge supplémentaire :** "Pilier" (10 ans et plus d'ancienneté), "Serviteur" (cumul de plusieurs fonctions actives).

### 4.5 Regroupement des membres (inchangé)
- Par lieu d'habitation, profession, fonction à l'église.

### 4.6 Anniversaires (inchangé + amélioration)
- Alerte jour J et 7 jours suivants.
- **Suggestion :** génération automatique d'une carte de vœux visuelle (aux couleurs de la charte, bleu/or) que l'admin peut envoyer ou afficher.

### 4.7 Contenus spirituels (inchangé + amélioration)
- Verset/thème de la semaine, liens vidéo, fil chronologique.
- **Suggestion :** possibilité d'épingler un contenu en tête de fil pendant une période donnée (ex. thème du mois).

### 4.8 Valorisation des invitations — points (inchangé + amélioration)
- Points automatiques, classement des inviteurs.
- **Suggestion :** paliers de reconnaissance (bronze/argent/or, en cohérence avec la charte graphique) affichés sur le profil, sans notion d'argent réel — uniquement symbolique.

### 4.9 Paramètres de l'église (inchangé)
- Jours de culte, gestion des comptes, partage du code d'accès.

---

## 5. MODÈLE DE DONNÉES (mis à jour)

**Plateforme**
super_admin_email (munokolive@gmail.com), liste des églises, journal d'audit global.

**Église**
code, nom, ville, jours de culte, titre du responsable, date de création, statut (actif/suspendu — géré par le Super Admin).

**Compte utilisateur**
email, mot de passe (haché), rôle (super_admin / administrateur église / membre), église rattachée (null pour le Super Admin, qui n'est rattaché à aucune église en particulier mais peut toutes les consulter), lien vers la fiche membre correspondante le cas échéant.

**Membre**
prénom, nom, date de naissance, photo, profession, lieu d'habitation, statut (Membre/Visiteur), fonction(s), date d'arrivée, "amené par", note pastorale privée, indicateur "besoin d'accompagnement" (optionnel).

**Pointage**
date, église, liste des membres présents.

**Contenu**
type (verset/vidéo/annonce plateforme), titre, texte ou lien, date de publication, portée (une église / toute la plateforme — ce dernier réservé au Super Admin).

**Journal d'audit** *(nouveau, essentiel)*
horodatage, compte ayant agi, église consultée/modifiée, type d'action (consultation, modification, export, suppression).

---

## 6. SÉCURITÉ ET GOUVERNANCE DU RÔLE SUPER ADMIN — recommandations importantes

Le Super Admin ayant un accès total (y compris aux notes pastorales confidentielles), voici des recommandations à intégrer dès la conception pour que cet accès reste un outil de gestion sain et ne devienne pas un point de fragilité pour la confiance des églises :

1. **Journal d'audit obligatoire et infalsifiable** : toute consultation ou action du Super Admin sur l'espace d'une église est journalisée (qui, quoi, quand). Cela protège autant les églises que toi-même en cas de litige.
2. **Transparence envers les églises utilisatrices** : mentionner clairement dans les conditions d'utilisation qu'un compte plateforme (Munokolive) a un accès de supervision, notamment pour la maintenance et le support — plutôt qu'un accès caché.
3. **Authentification renforcée pour le compte Super Admin** : mot de passe fort + authentification à deux facteurs (2FA) obligatoire, vu le niveau de sensibilité (notes pastorales, données personnelles de milliers de membres potentiels).
4. **Séparation des usages** : distinguer techniquement "voir en tant que" (mode support, avec trace) d'un accès en modification silencieuse — éviter que le Super Admin modifie des données d'église sans que cela soit visible pour l'église concernée.
5. **Minimisation par défaut** : même avec un accès total possible techniquement, prévoir que les tableaux de bord globaux du Super Admin affichent par défaut des **statistiques agrégées** (nombres, tendances) plutôt que le détail nominatif des notes pastorales — le détail nominatif ne s'ouvrant qu'à la demande, avec traçabilité.
6. **Sauvegardes et export sécurisés** : tout export global de données doit être chiffré et journalisé.

---

## 7. EXIGENCES NON FONCTIONNELLES (reprises + enrichies)

- Cloisonnement strict entre églises, **à l'exception du Super Admin dûment audité**.
- Authentification email/mot de passe, hachage des mots de passe, 2FA pour le Super Admin.
- Confidentialité des notes pastorales, sauf audit du Super Admin (journalisé).
- Ergonomie mobile prioritaire (usage terrain le jour du culte).
- Disponibilité continue, mode dégradé en cas de faible connexion (V2).
- Chargement de l'annuaire en moins de 2 secondes pour une église de quelques centaines de membres.
- Interface entièrement en français, calendrier localisé.
- Design conforme à la charte bleu / rouge foncé / blanc / or décrite en §2.

---

## 8. PHASAGE SUGGÉRÉ

| Phase | Contenu |
|---|---|
| V1 | Création d'église, fiches membres, pointage configurable, annuaire, profils, groupes, contenus, points d'invitation, notes pastorales, **console Super Admin de base (liste des églises + statistiques globales + mode "voir en tant que" avec journal d'audit)** |
| V2 | Backend sécurisé (hachage, base de données réelle, 2FA Super Admin), notifications automatiques (SMS/WhatsApp), alertes d'absence prolongée |
| V3 | Historique et export du registre (PDF), calendrier des événements, espace de demandes de prière, statistiques avancées, journal d'audit consultable et exportable par le Super Admin |

---

## 9. PROMPT DE GÉNÉRATION — VERSION PRÊTE À COLLER

> Conçois une application web/mobile appelée **"Église Connect"**, plateforme multi-églises de gestion communautaire.
>
> **Charte graphique :** bleu profond (#0B2E6B → #1B4DB1) comme couleur principale, rouge bordeaux foncé (#7A1626 → #A01F2E) comme couleur d'accent, blanc/blanc cassé pour les fonds, or (#C9A227 → #E8C24D) pour les éléments premium (badges, bordures, séparateurs). Design "sanctuaire moderne" : élégant, solennel mais épuré, inspiré des vitraux et des cartes de membre premium. Typographie serif élégante pour les titres, sans-serif lisible pour le corps de texte. Prévoir un mode sombre "Nuit de veillée".
>
> **Rôles :** Super Admin (compte munokolive@gmail.com, accès total et audité à toutes les églises de la plateforme), Pasteur/Responsable (admin d'une église), Diacre/Collaborateur, Membre, Visiteur.
>
> **Fonctionnalités principales :** création d'espace église avec code d'accès unique à 5 caractères, fiches membres complètes (identité, naissance, photo, profession, lieu, statut, fonctions multiples, date d'arrivée, "amené par", note pastorale privée), pointage des cultes configurable par église avec calcul d'assiduité, annuaire photo avec profils détaillés et badges automatiques (Nouveau, Fidèle, Ambassadeur, Pilier), regroupements par lieu/profession/fonction, alertes d'anniversaire, fil de contenus spirituels (verset/vidéo), système de points et classement des inviteurs.
>
> **Console Super Admin :** liste de toutes les églises avec statistiques, mode "voir en tant que" avec journal d'audit obligatoire, gestion des comptes, publication d'annonces plateforme, export de données sécurisé.
>
> **Exigences :** cloisonnement strict des données entre églises (sauf Super Admin audité), authentification sécurisée (2FA pour le Super Admin), interface mobile-first entièrement en français, chargement rapide de l'annuaire.

---

*Document généré pour servir de base de prompt à un outil de génération d'application. À adapter selon la stack technique retenue (web, Flutter, etc.).*
